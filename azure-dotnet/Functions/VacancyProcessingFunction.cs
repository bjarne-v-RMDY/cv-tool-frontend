using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Microsoft.Data.SqlClient;
using System.Text.Json;
using CVToolFunctions.Models;
using CVToolFunctions.Services;
using CVToolFunctions.Utils;

namespace CVToolFunctions.Functions;

public class VacancyProcessingFunction
{
    private readonly ILogger<VacancyProcessingFunction> _logger;
    private readonly BlobService _blobService;
    private readonly OpenAIService _openAIService;
    private readonly DatabaseService _databaseService;
    private readonly QueueService _queueService;
    private readonly ActivityLogService _activityLogService;

    public VacancyProcessingFunction(
        ILogger<VacancyProcessingFunction> logger,
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

    [Function("VacancyProcessing")]
    public async Task Run(
        [QueueTrigger("vacancy-processing-queue", Connection = "AzureWebJobsStorage")] string queueMessage)
    {
        _logger.LogInformation($"Vacancy Processing function triggered");
        _logger.LogInformation($"Queue message: {queueMessage}");

        try
        {
            await _activityLogService.AddActivityLogAsync(
                "processing",
                "Vacancy Processing Started",
                "Processing vacancy file from queue",
                "processing",
                new { queueMessage, timestamp = DateTime.UtcNow });

            // Parse queue message
            var item = JsonSerializer.Deserialize<VacancyQueueMessage>(queueMessage);
            if (item == null || string.IsNullOrEmpty(item.UniqueFileName))
            {
                throw new Exception("Invalid queue message format");
            }

            _logger.LogInformation($"Processing vacancy file: {item.FileName}");

            // Download blob
            var blobContent = await _blobService.DownloadBlobAsync("vacancy-files", item.UniqueFileName);

            // Extract text
            var vacancyText = TextExtractor.ExtractText(blobContent, item.FileType ?? "");
            vacancyText = TextExtractor.TruncateText(vacancyText);

            _logger.LogInformation($"Extracted {vacancyText.Length} characters from vacancy file");

            // Analyze with OpenAI
            var prompt = $@"You are an assistant that extracts structured vacancy/job assignment information from documents. Read the following vacancy document and return STRICT JSON with these fields:

{{
    ""vacancy"": {{
        ""title"": string,
        ""client"": string,
        ""description"": string,
        ""location"": string,
        ""duration"": string (e.g., ""3 months"", ""6 months"", ""1 year""),
        ""remoteWork"": boolean,
        ""startDate"": ""YYYY-MM-DD"" or null,
        ""budget"": string or null,
        ""requirements"": [
            {{
                ""type"": ""Technology"" | ""Role"" | ""Experience"" | ""Language"" | ""Certification"" | ""Soft Skill"",
                ""value"": string,
                ""isRequired"": boolean,
                ""priority"": 1 | 2 | 3  (1=High, 2=Medium, 3=Low)
            }}
        ]
    }}
}}

Important rules:
- Extract ALL requirements mentioned in the document
- Categorize each requirement appropriately:
  - Technology: Programming languages, frameworks, tools (e.g., ""React"", ""Python"", ""Docker"")
  - Role: Job titles, positions (e.g., ""Senior Developer"", ""Team Lead"")
  - Experience: Years of experience or specific experience requirements (e.g., ""5+ years"", ""startup experience"")
  - Language: Spoken languages (e.g., ""English"", ""Dutch"")
  - Certification: Required certifications (e.g., ""AWS Certified"", ""Scrum Master"")
  - Soft Skill: Non-technical skills (e.g., ""Communication"", ""Leadership"")
- Set isRequired based on words like ""must have"", ""required"", ""mandatory"" vs ""nice to have"", ""preferred""
- Set priority: 1 for critical/required, 2 for important, 3 for nice-to-have
- If dates are vague (e.g., ""Q1 2024""), estimate as best as possible
- If information is missing, use null for strings and empty arrays for lists
- Return ONLY valid JSON, no markdown formatting

Vacancy Document:
{vacancyText}";

            var analysisResult = await _openAIService.GenerateStructuredResponseAsync<VacancyAnalysisResult>(prompt, 0.1f);

            if (analysisResult == null || analysisResult.Vacancy == null)
            {
                throw new Exception("Failed to parse vacancy analysis result");
            }

            var vacancy = analysisResult.Vacancy;
            _logger.LogInformation($"Successfully analyzed vacancy: {vacancy.Title}");

            // Store in database
            int? assignmentId = null;
            var requirementsAdded = 0;

            using var connection = await _databaseService.GetConnectionAsync();

            // Insert vacancy
            using var command = new SqlCommand(@"
                INSERT INTO ProjectAssignments (Title, Description, Client, Duration, Location, RemoteWork, StartDate, Budget)
                OUTPUT INSERTED.Id
                VALUES (@Title, @Description, @Client, @Duration, @Location, @RemoteWork, @StartDate, @Budget)", connection);

            command.Parameters.AddWithValue("@Title", vacancy.Title ?? "Untitled Vacancy");
            command.Parameters.AddWithValue("@Description", (object?)vacancy.Description ?? DBNull.Value);
            command.Parameters.AddWithValue("@Client", (object?)vacancy.Client ?? DBNull.Value);
            command.Parameters.AddWithValue("@Duration", (object?)vacancy.Duration ?? DBNull.Value);
            command.Parameters.AddWithValue("@Location", (object?)vacancy.Location ?? DBNull.Value);
            command.Parameters.AddWithValue("@RemoteWork", vacancy.RemoteWork);
            command.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(vacancy.StartDate) ? DBNull.Value : vacancy.StartDate);
            command.Parameters.AddWithValue("@Budget", (object?)vacancy.Budget ?? DBNull.Value);

            assignmentId = (int)(await command.ExecuteScalarAsync())!;
            _logger.LogInformation($"Inserted vacancy: {vacancy.Title} (ID: {assignmentId})");

            // Insert requirements
            if (vacancy.Requirements != null)
            {
                foreach (var req in vacancy.Requirements)
                {
                    try
                    {
                        using var reqCommand = new SqlCommand(@"
                            INSERT INTO AssignmentRequirements (AssignmentId, RequirementType, RequirementValue, IsRequired, Priority)
                            VALUES (@AssignmentId, @RequirementType, @RequirementValue, @IsRequired, @Priority)", connection);

                        reqCommand.Parameters.AddWithValue("@AssignmentId", assignmentId);
                        reqCommand.Parameters.AddWithValue("@RequirementType", req.Type ?? "Other");
                        reqCommand.Parameters.AddWithValue("@RequirementValue", req.Value ?? "");
                        reqCommand.Parameters.AddWithValue("@IsRequired", req.IsRequired);
                        reqCommand.Parameters.AddWithValue("@Priority", req.Priority > 0 ? req.Priority : 2);

                        await reqCommand.ExecuteNonQueryAsync();
                        requirementsAdded++;
                    }
                    catch (Exception reqEx)
                    {
                        _logger.LogError(reqEx, $"Error adding requirement {req.Value}");
                    }
                }
            }

            _logger.LogInformation($"Processing completed: Vacancy ID {assignmentId}, {requirementsAdded} requirements added");

            // Queue vacancy matching
            if (assignmentId.HasValue)
            {
                await _queueService.SendMessageAsync("vacancy-matching-queue", new VacancyMatchingQueueMessage { VacancyId = assignmentId.Value });
                _logger.LogInformation($"Vacancy matching queued for vacancy ID {assignmentId}");
            }

            await _activityLogService.AddActivityLogAsync(
                "processing",
                "Vacancy Processing Completed",
                $"Successfully processed {item.FileName}. Added vacancy \"{vacancy.Title}\" with {requirementsAdded} requirements.",
                "completed",
                new
                {
                    fileName = item.FileName,
                    assignmentId,
                    vacancyTitle = vacancy.Title,
                    requirementsAdded
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing vacancy file");

            await _activityLogService.AddActivityLogAsync(
                "error",
                "Vacancy Processing Failed",
                $"Failed to process vacancy file: {ex.Message}",
                "failed",
                new { error = ex.Message, stack = ex.StackTrace });

            throw;
        }
    }
}


