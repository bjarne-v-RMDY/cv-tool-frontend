using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Microsoft.Data.SqlClient;
using System.Text.Json;
using System.Text;
using CVToolFunctions.Models;
using CVToolFunctions.Services;

namespace CVToolFunctions.Functions;

public class IndexCVFunction
{
    private readonly ILogger<IndexCVFunction> _logger;
    private readonly DatabaseService _databaseService;
    private readonly OpenAIService _openAIService;
    private readonly SearchService _searchService;
    private readonly ActivityLogService _activityLogService;

    public IndexCVFunction(
        ILogger<IndexCVFunction> logger,
        DatabaseService databaseService,
        OpenAIService openAIService,
        SearchService searchService,
        ActivityLogService activityLogService)
    {
        _logger = logger;
        _databaseService = databaseService;
        _openAIService = openAIService;
        _searchService = searchService;
        _activityLogService = activityLogService;
    }

    [Function("IndexCV")]
    public async Task Run(
        [QueueTrigger("cv-indexing-queue", Connection = "AzureWebJobsStorage")] string queueMessage)
    {
        _logger.LogInformation($"CV Indexing function triggered: {queueMessage}");

        // Parse userId from queue message
        int userId;
        try
        {
            var message = JsonSerializer.Deserialize<IndexingQueueMessage>(queueMessage);
            userId = message!.UserId;
        }
        catch
        {
            userId = int.Parse(queueMessage);
        }

        if (userId <= 0)
        {
            _logger.LogError($"Invalid userId in queue message: {queueMessage}");
            return;
        }

        await _activityLogService.AddActivityLogAsync(
            "indexing",
            "Indexing Started",
            $"Started indexing candidate data for user ID: {userId}",
            "in_progress",
            new { userId });

        try
        {
            using var connection = await _databaseService.GetConnectionAsync();

            // Fetch user data
            var userCommand = new SqlCommand(@"
                SELECT Id, Name, Email, Phone, Location, LinkedInProfile
                FROM Users
                WHERE Id = @UserId", connection);
            userCommand.Parameters.AddWithValue("@UserId", userId);

            Dictionary<string, object?>? user = null;
            using (var reader = await userCommand.ExecuteReaderAsync())
            {
                if (await reader.ReadAsync())
                {
                    user = new Dictionary<string, object?>
                    {
                        ["Id"] = reader.GetInt32(0),
                        ["Name"] = reader.GetString(1),
                        ["Email"] = reader.IsDBNull(2) ? null : reader.GetString(2),
                        ["Phone"] = reader.IsDBNull(3) ? null : reader.GetString(3),
                        ["Location"] = reader.IsDBNull(4) ? null : reader.GetString(4),
                        ["LinkedInProfile"] = reader.IsDBNull(5) ? null : reader.GetString(5)
                    };
                }
            }

            if (user == null)
            {
                _logger.LogError($"User not found: {userId}");
                await _activityLogService.AddActivityLogAsync(
                    "indexing",
                    "Indexing Failed",
                    $"User not found: {userId}",
                    "failed",
                    new { userId });
                return;
            }

            // Fetch projects
            var projectsCommand = new SqlCommand(@"
                SELECT Id, Title, Description, StartDate, EndDate, Role, Company
                FROM Projects
                WHERE UserId = @UserId
                ORDER BY StartDate DESC", connection);
            projectsCommand.Parameters.AddWithValue("@UserId", userId);

            var projects = new List<Dictionary<string, object?>>();
            using (var reader = await projectsCommand.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    projects.Add(new Dictionary<string, object?>
                    {
                        ["Id"] = reader.GetInt32(0),
                        ["Title"] = reader.IsDBNull(1) ? null : reader.GetString(1),
                        ["Description"] = reader.IsDBNull(2) ? null : reader.GetString(2),
                        ["StartDate"] = reader.IsDBNull(3) ? null : reader.GetDateTime(3).ToString("yyyy-MM-dd"),
                        ["EndDate"] = reader.IsDBNull(4) ? null : reader.GetDateTime(4).ToString("yyyy-MM-dd"),
                        ["Role"] = reader.IsDBNull(5) ? null : reader.GetString(5),
                        ["Company"] = reader.IsDBNull(6) ? null : reader.GetString(6)
                    });
                }
            }

            // Fetch technologies
            var techCommand = new SqlCommand(@"
                SELECT t.ProjectId, t.Category, t.Technology
                FROM Technologies t
                INNER JOIN Projects p ON t.ProjectId = p.Id
                WHERE p.UserId = @UserId
                ORDER BY t.Category, t.Technology", connection);
            techCommand.Parameters.AddWithValue("@UserId", userId);

            var technologies = new List<Dictionary<string, object>>();
            using (var reader = await techCommand.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    technologies.Add(new Dictionary<string, object>
                    {
                        ["ProjectId"] = reader.GetInt32(0),
                        ["Category"] = reader.IsDBNull(1) ? "Other" : reader.GetString(1),
                        ["Technology"] = reader.GetString(2)
                    });
                }
            }

            // Fetch dynamic fields
            var dynamicCommand = new SqlCommand(@"
                SELECT FieldId, FieldValue
                FROM UserDynamicFields
                WHERE UserId = @UserId", connection);
            dynamicCommand.Parameters.AddWithValue("@UserId", userId);

            var dynamicFields = new List<Dictionary<string, object>>();
            using (var reader = await dynamicCommand.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    dynamicFields.Add(new Dictionary<string, object>
                    {
                        ["FieldId"] = reader.GetInt32(0),
                        ["FieldValue"] = reader.GetString(1)
                    });
                }
            }

            // Process data
            var skills = new List<string>();
            var tools = new List<string>();
            var certifications = new List<string>();
            var languagesSpoken = new List<string>();
            var programmingLanguages = new List<string>();
            int yearsOfExperience = 0;
            var portfolioURL = "";
            var githubProfile = "";

            // Collect skills from technologies
            foreach (var tech in technologies)
            {
                skills.Add(tech["Technology"].ToString()!);
            }

            // Process dynamic fields
            foreach (var field in dynamicFields)
            {
                var fieldId = (int)field["FieldId"];
                var value = field["FieldValue"].ToString()!;

                try
                {
                    var parsedValue = TryParseJson(value);

                    switch (fieldId)
                    {
                        case 1: // ProgrammingLanguages
                            AddToList(programmingLanguages, parsedValue);
                            AddToList(skills, parsedValue);
                            break;
                        case 2: // DesignTools
                            AddToList(tools, parsedValue);
                            break;
                        case 4: // MobilePlatforms
                            AddToList(skills, parsedValue);
                            break;
                        case 5: // Certifications
                            AddToList(certifications, parsedValue);
                            break;
                        case 6: // Languages
                            AddToList(languagesSpoken, parsedValue);
                            break;
                        case 7: // YearsOfExperience
                            yearsOfExperience = int.TryParse(value, out var years) ? years : 0;
                            break;
                        case 8: // PortfolioURL
                            portfolioURL = value;
                            break;
                        case 9: // GitHubProfile
                            githubProfile = value;
                            break;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"Failed to parse dynamic field {fieldId}: {value}");
                }
            }

            // Build project descriptions
            var projectDescriptions = new StringBuilder();
            foreach (var project in projects)
            {
                var projectId = project["Id"] != null ? Convert.ToInt32(project["Id"]) : 0;
                var projectTechs = technologies
                    .Where(t => Convert.ToInt32(t["ProjectId"]) == projectId)
                    .Select(t => t["Technology"].ToString())
                    .ToList();

                projectDescriptions.AppendLine($"{project["Title"]} ({project["Role"]} at {project["Company"]}, {project["StartDate"]} - {project["EndDate"]}): {project["Description"]}");
                projectDescriptions.AppendLine($"Technologies: {string.Join(", ", projectTechs)}");
                projectDescriptions.AppendLine();
            }

            // Create content for embedding
            var content = $@"
Name: {user["Name"]}
Email: {user["Email"]}
Location: {user["Location"] ?? "Not specified"}
Years of Experience: {yearsOfExperience}

Programming Languages: {string.Join(", ", programmingLanguages)}
Skills & Technologies: {string.Join(", ", skills)}
Tools: {string.Join(", ", tools)}

Languages Spoken: {string.Join(", ", languagesSpoken)}
Certifications: {string.Join(", ", certifications)}

Portfolio: {portfolioURL}
GitHub: {githubProfile}
LinkedIn: {user["LinkedInProfile"]}

Projects:
{projectDescriptions}
".Trim();

            _logger.LogInformation($"Content preview: {content.Substring(0, Math.Min(500, content.Length))}");

            // Generate embedding
            var embedding = await _openAIService.GenerateEmbeddingAsync(content);

            // Calculate seniority
            var seniority = yearsOfExperience >= 7 ? "senior" : yearsOfExperience >= 3 ? "mid" : "junior";

            // Create search document
            var searchDoc = new
            {
                userId = userId.ToString(),
                name = user["Name"]?.ToString() ?? "Unknown",
                email = user["Email"]?.ToString() ?? "",
                summary = $"{yearsOfExperience} years experience in {string.Join(", ", programmingLanguages.Take(3))}",
                skills = skills.Distinct().ToList(),
                yearsOfExperience,
                seniority,
                projects = projectDescriptions.ToString(),
                certifications,
                preferredRoles = new List<string>(),
                location = user["Location"]?.ToString() ?? "",
                tools = tools.Distinct().ToList(),
                languagesSpoken,
                content,
                contentVector = embedding,
                lastUpdated = DateTime.UtcNow.ToString("o")
            };

            // Index document
            await _searchService.IndexDocumentAsync(searchDoc);

            // Update user record
            using var updateCommand = new SqlCommand(@"
                UPDATE Users 
                SET IsIndexed = 1, LastIndexedAt = GETUTCDATE(), IndexVersion = 1
                WHERE Id = @UserId", connection);
            updateCommand.Parameters.AddWithValue("@UserId", userId);
            await updateCommand.ExecuteNonQueryAsync();

            _logger.LogInformation($"Successfully indexed user: {userId}");

            await _activityLogService.AddActivityLogAsync(
                "indexing",
                "Indexing Completed",
                $"Successfully indexed candidate: {user["Name"]}",
                "completed",
                new { userId, skillsCount = skills.Count, projectsCount = projects.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error indexing CV");
            await _activityLogService.AddActivityLogAsync(
                "indexing",
                "Indexing Failed",
                $"Failed to index candidate data: {ex.Message}",
                "failed",
                new { userId, error = ex.Message });
            throw;
        }
    }

    private object TryParseJson(string value)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(value) ?? new List<string> { value };
        }
        catch
        {
            return value;
        }
    }

    private void AddToList(List<string> list, object value)
    {
        if (value is List<string> stringList)
        {
            list.AddRange(stringList);
        }
        else if (value is string str)
        {
            list.Add(str);
        }
    }
}


