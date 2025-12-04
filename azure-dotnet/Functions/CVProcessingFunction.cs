using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;
using CVToolFunctions.Models;
using CVToolFunctions.Services;
using CVToolFunctions.Utils;

namespace CVToolFunctions.Functions;

public class CVProcessingFunction
{
    private readonly ILogger<CVProcessingFunction> _logger;
    private readonly BlobService _blobService;
    private readonly OpenAIService _openAIService;
    private readonly DatabaseService _databaseService;
    private readonly QueueService _queueService;
    private readonly ActivityLogService _activityLogService;

    public CVProcessingFunction(
        ILogger<CVProcessingFunction> logger,
        BlobService blobService,
        OpenAIService openAIService,
        DatabaseService databaseService,
        QueueService queueService,
        ActivityLogService activityLogService)
    {
        _logger = logger;
        _blobService = blobService;
        _openAIService = openAIService;
        _databaseService = databaseService;
        _queueService = queueService;
        _activityLogService = activityLogService;
    }

    [Function("CVProcessing")]
    public async Task Run(
        [QueueTrigger("cv-processing-queue", Connection = "AzureWebJobsStorage")] string queueMessage)
    {
        _logger.LogInformation($"CV Processing function triggered");
        _logger.LogInformation($"Queue message: {queueMessage}");

        try
        {
            await _activityLogService.AddActivityLogAsync(
                "processing",
                "CV Processing Started",
                "Processing CV file from queue",
                "processing",
                new { queueMessage, timestamp = DateTime.UtcNow });

            // Parse queue message - handle base64 encoding if needed
            string jsonMessage = queueMessage;
            try
            {
                // Try to decode as base64 first (Azure Storage Queues send base64-encoded messages)
                if (!queueMessage.TrimStart().StartsWith("{"))
                {
                    var bytes = Convert.FromBase64String(queueMessage);
                    jsonMessage = Encoding.UTF8.GetString(bytes);
                    _logger.LogInformation("Decoded base64 queue message");
                }
            }
            catch
            {
                // Not base64, use as-is
                jsonMessage = queueMessage;
            }

            // Parse JSON (case-insensitive)
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            var item = JsonSerializer.Deserialize<CVQueueMessage>(jsonMessage, options);
            if (item == null || string.IsNullOrEmpty(item.UniqueFileName))
            {
                _logger.LogError($"Invalid queue message format. Message: {jsonMessage}");
                throw new Exception("Invalid queue message format");
            }

            _logger.LogInformation($"Processing CV file: {item.FileName}");

            // Download blob
            var blobContent = await _blobService.DownloadBlobAsync("cv-files", item.UniqueFileName);

            // Extract text
            var cvText = TextExtractor.ExtractText(blobContent, item.FileType ?? "");
            cvText = TextExtractor.TruncateText(cvText);

            _logger.LogInformation($"Extracted {cvText.Length} characters from CV");

            // Analyze with OpenAI
            var prompt = $@"You are an assistant that extracts structured candidate information for a software company focused on web development, mobile development, UI/UX design, and AR/VR. Read the following CV text and return STRICT JSON with these fields:
{{
    ""name"": string,
    ""email"": string,
    ""phone"": string,
    ""location"": string,
    ""linkedInProfile"": string,
    ""summary"": string,
    ""yearsOfExperience"": number,
    ""seniority"": ""junior"" | ""mid"" | ""senior"" | ""lead"",
    ""skills"": {{
        ""web"": string[],
        ""mobile"": string[],
        ""uiux"": string[],
        ""arvr"": string[],
        ""other"": string[]
    }},
    ""tools"": string[],
    ""languagesSpoken"": string[],
    ""notableProjects"": [{{ ""name"": string, ""description"": string, ""technologies"": string[], ""startDate"": string, ""endDate"": string, ""role"": string, ""company"": string }}],
    ""certifications"": string[],
    ""preferredRoles"": string[],
    ""portfolioURL"": string,
    ""githubProfile"": string,
    ""behanceProfile"": string
}}
Only output JSON. CV Text:

{cvText}";

            var analysisResult = await _openAIService.GenerateStructuredResponseAsync<CVAnalysisResult>(prompt, 0.2f);

            if (analysisResult == null || string.IsNullOrEmpty(analysisResult.Name))
            {
                throw new Exception("Failed to parse CV analysis result");
            }

            _logger.LogInformation($"Successfully analyzed CV for: {analysisResult.Name}");

            // Generate email if not found
            var userEmail = string.IsNullOrWhiteSpace(analysisResult.Email)
                ? EmailGenerator.GenerateEmailFromName(analysisResult.Name)
                : analysisResult.Email;

            if (userEmail != analysisResult.Email)
            {
                _logger.LogInformation($"Generated email: {userEmail}");
            }

            // Check if user exists
            var existingUserId = await _databaseService.FindUserByEmailAsync(userEmail);
            int userId;
            bool isExistingUser = existingUserId.HasValue;

            if (isExistingUser)
            {
                userId = existingUserId!.Value;
                _logger.LogInformation($"Found existing user with ID: {userId}");

                // Update user
                await _databaseService.UpdateUserAsync(
                    userId,
                    analysisResult.Name,
                    analysisResult.Phone,
                    analysisResult.Location,
                    analysisResult.LinkedInProfile);

                // Clear old data
                await _databaseService.DeleteUserProjectsAsync(userId);
                await _databaseService.DeleteUserDynamicFieldsAsync(userId);
            }
            else
            {
                // Create new user
                userId = await _databaseService.CreateUserAsync(
                    analysisResult.Name,
                    userEmail,
                    analysisResult.Phone,
                    analysisResult.Location,
                    analysisResult.LinkedInProfile);

                _logger.LogInformation($"Created new user with ID: {userId}");
            }

            // Upsert CV file record
            await _databaseService.UpsertCVFileAsync(
                userId,
                item.FileName ?? item.UniqueFileName,
                item.BlobUrl ?? "",
                item.FileSize,
                isExistingUser);

            // Insert projects
            if (analysisResult.NotableProjects != null)
            {
                foreach (var project in analysisResult.NotableProjects)
                {
                    var projectId = await _databaseService.InsertProjectAsync(
                        userId,
                        project.Name ?? "Untitled Project",
                        project.Company ?? "Unknown",
                        project.Role,
                        project.Description,
                        project.StartDate,
                        project.EndDate);

                    // Insert technologies
                    if (project.Technologies != null)
                    {
                        foreach (var tech in project.Technologies)
                        {
                            await _databaseService.InsertTechnologyAsync(projectId, tech);
                        }
                    }
                }
            }

            // Insert dynamic fields
            if (analysisResult.YearsOfExperience > 0)
            {
                await _databaseService.InsertUserDynamicFieldAsync(userId, 7, analysisResult.YearsOfExperience.ToString());
            }

            if (!string.IsNullOrEmpty(analysisResult.PortfolioURL))
            {
                await _databaseService.InsertUserDynamicFieldAsync(userId, 8, analysisResult.PortfolioURL);
            }

            if (!string.IsNullOrEmpty(analysisResult.GithubProfile))
            {
                await _databaseService.InsertUserDynamicFieldAsync(userId, 9, analysisResult.GithubProfile);
            }

            if (!string.IsNullOrEmpty(analysisResult.BehanceProfile))
            {
                await _databaseService.InsertUserDynamicFieldAsync(userId, 10, analysisResult.BehanceProfile);
            }

            if (analysisResult.Certifications != null && analysisResult.Certifications.Any())
            {
                await _databaseService.InsertUserDynamicFieldAsync(userId, 5, JsonSerializer.Serialize(analysisResult.Certifications));
            }

            if (analysisResult.LanguagesSpoken != null && analysisResult.LanguagesSpoken.Any())
            {
                await _databaseService.InsertUserDynamicFieldAsync(userId, 6, JsonSerializer.Serialize(analysisResult.LanguagesSpoken));
            }

            _logger.LogInformation($"Successfully saved all data for user {userId}");

            // Queue for indexing
            await _queueService.SendMessageAsync("cv-indexing-queue", new IndexingQueueMessage { UserId = userId });
            _logger.LogInformation($"Queued user {userId} for AI Search indexing");

            await _activityLogService.AddActivityLogAsync(
                "completed",
                "CV Processing Completed",
                "CV file processed successfully",
                "completed",
                new { userId, fileName = item.FileName, isExistingUser });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing CV");

            await _activityLogService.AddActivityLogAsync(
                "error",
                "CV Processing Failed",
                "Error occurred during CV processing",
                "failed",
                new { error = ex.Message, timestamp = DateTime.UtcNow });

            throw;
        }
    }
}


