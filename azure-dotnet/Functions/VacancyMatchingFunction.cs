using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Microsoft.Data.SqlClient;
using System.Text.Json;
using CVToolFunctions.Models;
using CVToolFunctions.Services;
using System.Text;

namespace CVToolFunctions.Functions;

public class VacancyMatchingFunction
{
    private readonly ILogger<VacancyMatchingFunction> _logger;
    private readonly DatabaseService _databaseService;
    private readonly OpenAIService _openAIService;
    private readonly SearchService _searchService;
    private readonly ActivityLogService _activityLogService;

    public VacancyMatchingFunction(
        ILogger<VacancyMatchingFunction> logger,
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

    [Function("VacancyMatching")]
    public async Task Run(
        [QueueTrigger("vacancy-matching-queue", Connection = "AzureWebJobsStorage")] string queueMessage)
    {
        _logger.LogInformation($"Vacancy Matching function triggered");
        _logger.LogInformation($"Queue message: {queueMessage}");

        try
        {
            // Parse queue message
            var item = JsonSerializer.Deserialize<VacancyMatchingQueueMessage>(queueMessage);
            if (item == null || item.VacancyId <= 0)
            {
                throw new Exception("Invalid vacancy ID in queue message");
            }

            var vacancyId = item.VacancyId;
            _logger.LogInformation($"Processing matching for vacancy ID: {vacancyId}");

            using var connection = await _databaseService.GetConnectionAsync();

            // Fetch vacancy details
            var vacancyCommand = new SqlCommand(@"
                SELECT Id, Title, Description, Client
                FROM ProjectAssignments
                WHERE Id = @VacancyId", connection);
            vacancyCommand.Parameters.AddWithValue("@VacancyId", vacancyId);

            Dictionary<string, object?>? vacancy = null;
            using (var reader = await vacancyCommand.ExecuteReaderAsync())
            {
                if (await reader.ReadAsync())
                {
                    vacancy = new Dictionary<string, object?>
                    {
                        ["Id"] = reader.GetInt32(0),
                        ["Title"] = reader.IsDBNull(1) ? null : reader.GetString(1),
                        ["Description"] = reader.IsDBNull(2) ? null : reader.GetString(2),
                        ["Client"] = reader.IsDBNull(3) ? null : reader.GetString(3)
                    };
                }
            }

            if (vacancy == null)
            {
                throw new Exception($"Vacancy not found: {vacancyId}");
            }

            // Fetch requirements
            var reqCommand = new SqlCommand(@"
                SELECT RequirementType, RequirementValue, IsRequired, Priority
                FROM AssignmentRequirements
                WHERE AssignmentId = @VacancyId
                ORDER BY Priority ASC, IsRequired DESC", connection);
            reqCommand.Parameters.AddWithValue("@VacancyId", vacancyId);

            var requirements = new List<Dictionary<string, object>>();
            using (var reader = await reqCommand.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    requirements.Add(new Dictionary<string, object>
                    {
                        ["RequirementType"] = reader.GetString(0),
                        ["RequirementValue"] = reader.GetString(1),
                        ["IsRequired"] = reader.GetBoolean(2),
                        ["Priority"] = reader.GetInt32(3)
                    });
                }
            }

            _logger.LogInformation($"Found {requirements.Count} requirements for vacancy \"{vacancy["Title"]}\"");

            // Build search query
            var searchText = BuildSearchQuery(vacancy, requirements);

            // Generate embedding
            var queryVector = await _openAIService.GenerateEmbeddingAsync(searchText);

            // Search for candidates
            var searchResults = await _searchService.VectorSearchAsync<Dictionary<string, object>>(queryVector, 20);

            var candidates = searchResults.Select(r => new
            {
                Score = r.Score,
                Document = r.Document
            }).ToList();

            _logger.LogInformation($"Found {candidates.Count} candidates from vector search, evaluating with LLM...");

            // Evaluate candidates with LLM
            var evaluatedCandidates = new List<Dictionary<string, object>>();

            foreach (var candidate in candidates)
            {
                try
                {
                    var evaluation = await EvaluateCandidateWithLLM(candidate.Document, requirements, candidate.Score ?? 0);
                    evaluatedCandidates.Add(evaluation);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error evaluating candidate {candidate.Document.GetValueOrDefault("userId", "unknown")}");
                }
            }

            _logger.LogInformation($"Evaluated {evaluatedCandidates.Count} candidates, storing results...");

            // Delete old matching results
            using var deleteCommand = new SqlCommand(
                "DELETE FROM MatchingResults WHERE AssignmentId = @VacancyId", connection);
            deleteCommand.Parameters.AddWithValue("@VacancyId", vacancyId);
            await deleteCommand.ExecuteNonQueryAsync();

            // Store results
            var storedCount = 0;
            foreach (var candidate in evaluatedCandidates)
            {
                try
                {
                    using var insertCommand = new SqlCommand(@"
                        INSERT INTO MatchingResults (
                            AssignmentId, UserId, Score, OverallScore,
                            MatchedRequirements, MissingRequirements, Reasoning,
                            RequirementBreakdown, LastEvaluatedAt, EvaluationVersion
                        )
                        VALUES (
                            @AssignmentId, @UserId, @Score, @OverallScore,
                            @MatchedRequirements, @MissingRequirements, @Reasoning,
                            @RequirementBreakdown, GETUTCDATE(), @EvaluationVersion
                        )", connection);

                    insertCommand.Parameters.AddWithValue("@AssignmentId", vacancyId);
                    insertCommand.Parameters.AddWithValue("@UserId", int.Parse(candidate["userId"].ToString()!));
                    insertCommand.Parameters.AddWithValue("@Score", (decimal)(double)candidate["score"]);
                    insertCommand.Parameters.AddWithValue("@OverallScore", (decimal)(double)candidate["overallScore"]);
                    insertCommand.Parameters.AddWithValue("@MatchedRequirements", JsonSerializer.Serialize(candidate["matchedRequirements"]));
                    insertCommand.Parameters.AddWithValue("@MissingRequirements", JsonSerializer.Serialize(candidate["missingRequirements"]));
                    insertCommand.Parameters.AddWithValue("@Reasoning", candidate["reasoning"]);
                    insertCommand.Parameters.AddWithValue("@RequirementBreakdown", JsonSerializer.Serialize(candidate["requirementBreakdown"]));
                    insertCommand.Parameters.AddWithValue("@EvaluationVersion", 1);

                    await insertCommand.ExecuteNonQueryAsync();
                    storedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error storing result for user {candidate.GetValueOrDefault("userId", "unknown")}");
                }
            }

            _logger.LogInformation($"Vacancy matching completed: {storedCount} results stored for vacancy ID {vacancyId}");

            await _activityLogService.AddActivityLogAsync(
                "matching",
                "Vacancy Matching Completed",
                $"Evaluated {evaluatedCandidates.Count} candidates for vacancy \"{vacancy["Title"]}\"",
                "completed",
                new
                {
                    vacancyId,
                    vacancyTitle = vacancy["Title"],
                    candidatesEvaluated = evaluatedCandidates.Count,
                    resultsStored = storedCount
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing vacancy matching");

            await _activityLogService.AddActivityLogAsync(
                "error",
                "Vacancy Matching Failed",
                $"Failed to match candidates: {ex.Message}",
                "failed",
                new { error = ex.Message });

            throw;
        }
    }

    private string BuildSearchQuery(Dictionary<string, object?> vacancy, List<Dictionary<string, object>> requirements)
    {
        var parts = new List<string>();

        if (vacancy["Title"] != null)
        {
            parts.Add($"Job Title: {vacancy["Title"]}");
        }

        if (vacancy["Description"] != null)
        {
            parts.Add($"Description: {vacancy["Description"]}");
        }

        if (vacancy["Client"] != null)
        {
            parts.Add($"Client: {vacancy["Client"]}");
        }

        // Group requirements by type
        var reqsByType = requirements
            .GroupBy(r => r["RequirementType"].ToString())
            .ToDictionary(g => g.Key!, g => g.Select(r => r["RequirementValue"].ToString()).ToList());

        foreach (var (type, values) in reqsByType)
        {
            parts.Add($"{type}: {string.Join(", ", values!)}");
        }

        return string.Join("\n", parts);
    }

    private async Task<Dictionary<string, object>> EvaluateCandidateWithLLM(
        Dictionary<string, object> candidate,
        List<Dictionary<string, object>> requirements,
        double vectorScore)
    {
        try
        {
            var requiredReqs = requirements.Where(r => (bool)r["IsRequired"]).ToList();
            var optionalReqs = requirements.Where(r => !(bool)r["IsRequired"]).ToList();

            var skillsList = candidate.GetValueOrDefault("skills", new List<string>()) as JsonElement?;
            var skillsStr = skillsList.HasValue && skillsList.Value.ValueKind == JsonValueKind.Array
                ? string.Join(", ", skillsList.Value.EnumerateArray().Select(e => e.GetString()))
                : "";

            var toolsList = candidate.GetValueOrDefault("tools", new List<string>()) as JsonElement?;
            var toolsStr = toolsList.HasValue && toolsList.Value.ValueKind == JsonValueKind.Array
                ? string.Join(", ", toolsList.Value.EnumerateArray().Select(e => e.GetString()))
                : "";

            var prompt = $@"You are evaluating if a candidate matches a job vacancy requirements.

IMPORTANT: Be smart about implied skills and technology relationships:
- **Frontend Frameworks** (React, Vue, Angular, Svelte) imply: JavaScript/TypeScript, HTML, CSS, DOM manipulation, browser APIs
- **Backend Frameworks** (Express, NestJS, Django, Flask, Spring) imply: their base language (Node.js, Python, Java), REST APIs, HTTP, databases
- **Mobile** (React Native, Flutter) imply: their base framework (React, Dart) plus mobile-specific knowledge
- **Full-Stack** roles imply: both frontend and backend fundamentals
- **Senior/Lead** roles imply: the fundamentals of their specialty even if not explicitly listed
- **Related Technologies**: Next.js implies React; Gatsby implies React; Nuxt implies Vue; Angular Material implies Angular

When evaluating:
1. If a candidate lists ""React"", credit them for JavaScript, HTML, CSS knowledge (even if not explicitly listed)
2. If they list ""Node.js + Express"", credit them for REST API and backend fundamentals
3. If they're ""Senior Frontend Developer"", assume HTML/CSS/JS fundamentals
4. Use common sense about technology stacks and their prerequisites
5. Still require explicit evidence for specialized tools (Docker, Kubernetes, specific databases)

Be REASONABLE, not overly strict. Technology names vary (React.js = React = ReactJS).

Candidate Profile:
- Name: {candidate.GetValueOrDefault("name", "Unknown")}
- Years of Experience: {candidate.GetValueOrDefault("yearsOfExperience", "Not specified")}
- Seniority: {candidate.GetValueOrDefault("seniority", "Not specified")}
- Location: {candidate.GetValueOrDefault("location", "Not specified")}
- Skills: {skillsStr}
- Tools: {toolsStr}
- Projects: {candidate.GetValueOrDefault("projects", "None listed")}

Required Requirements (MUST match for high score):
{string.Join("\n", requiredReqs.Select(r => $"- ★ {r["RequirementValue"]} ({r["RequirementType"]}, Priority: {GetPriorityLabel((int)r["Priority"])})"))}

Nice-to-Have Requirements (bonus points):
{string.Join("\n", optionalReqs.Select(r => $"- ☆ {r["RequirementValue"]} ({r["RequirementType"]}, Priority: {GetPriorityLabel((int)r["Priority"])})"))}

Scoring Guidelines:
- Missing required requirements should significantly lower the score
- Each matched required requirement is worth more than optional ones
- Consider priority levels (1=High has more weight than 3=Low)
- Overall score should be 0-100

Return ONLY valid JSON in this exact format:
{{
  ""overallScore"": <number 0-100>,
  ""matchedRequirements"": [""<req1>"", ""<req2>""],
  ""missingRequirements"": [""<req1>"", ""<req2>""],
  ""reasoning"": ""<brief explanation of the score>"",
  ""requirementBreakdown"": [
    {{
      ""requirement"": ""<requirement name>"",
      ""type"": ""<requirement type>"",
      ""matched"": <boolean>,
      ""evidence"": ""<where/how it was found or why it's missing>"",
      ""isRequired"": <boolean>,
      ""priority"": <1|2|3>
    }}
  ]
}}";

            var evaluation = await _openAIService.GenerateStructuredResponseAsync<Dictionary<string, object>>(prompt, 0.1f);

            if (evaluation == null)
            {
                throw new Exception("Failed to get evaluation from LLM");
            }

            // Merge with candidate data
            var result = new Dictionary<string, object>(candidate)
            {
                ["score"] = vectorScore,
                ["overallScore"] = evaluation.GetValueOrDefault("overallScore", 0),
                ["matchedRequirements"] = evaluation.GetValueOrDefault("matchedRequirements", new List<string>()),
                ["missingRequirements"] = evaluation.GetValueOrDefault("missingRequirements", new List<string>()),
                ["reasoning"] = evaluation.GetValueOrDefault("reasoning", "No reasoning provided"),
                ["requirementBreakdown"] = evaluation.GetValueOrDefault("requirementBreakdown", new List<object>())
            };

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error evaluating candidate {candidate.GetValueOrDefault("userId", "unknown")}");

            // Fallback
            return new Dictionary<string, object>(candidate)
            {
                ["score"] = vectorScore,
                ["overallScore"] = Math.Round(vectorScore * 100),
                ["matchedRequirements"] = new List<string>(),
                ["missingRequirements"] = requirements.Select(r => r["RequirementValue"].ToString()!).ToList(),
                ["reasoning"] = "LLM evaluation failed, using vector similarity score as fallback",
                ["requirementBreakdown"] = requirements.Select(r => new
                {
                    requirement = r["RequirementValue"],
                    type = r["RequirementType"],
                    matched = false,
                    evidence = "Evaluation failed",
                    isRequired = r["IsRequired"],
                    priority = r["Priority"]
                }).ToList()
            };
        }
    }

    private string GetPriorityLabel(int priority)
    {
        return priority switch
        {
            1 => "High",
            2 => "Medium",
            3 => "Low",
            _ => "Unknown"
        };
    }
}


