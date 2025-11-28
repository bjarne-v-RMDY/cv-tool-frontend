using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;
using CVToolFunctions.Models;
using CVToolFunctions.Services;
using CVToolFunctions.Utils;

namespace CVToolFunctions.Functions;

public class ProjectProcessingFunction
{
    private readonly ILogger<ProjectProcessingFunction> _logger;
    private readonly BlobService _blobService;
    private readonly OpenAIService _openAIService;
    private readonly DatabaseService _databaseService;
    private readonly QueueService _queueService;
    private readonly ActivityLogService _activityLogService;

    public ProjectProcessingFunction(
        ILogger<ProjectProcessingFunction> logger,
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

    [Function("ProjectProcessing")]
    public async Task Run(
        [QueueTrigger("project-processing-queue", Connection = "AzureWebJobsStorage")] string queueMessage)
    {
        _logger.LogInformation($"Project Processing function triggered");
        _logger.LogInformation($"Queue message: {queueMessage}");

        try
        {
            await _activityLogService.AddActivityLogAsync(
                "processing",
                "Project Processing Started",
                "Processing project file from queue",
                "processing",
                new { queueMessage, timestamp = DateTime.UtcNow });

            // Parse queue message - handle base64 encoding if needed
            string jsonMessage = queueMessage;
            try
            {
                if (!queueMessage.TrimStart().StartsWith("{"))
                {
                    var bytes = Convert.FromBase64String(queueMessage);
                    jsonMessage = Encoding.UTF8.GetString(bytes);
                }
            }
            catch
            {
                jsonMessage = queueMessage;
            }

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var item = JsonSerializer.Deserialize<ProjectQueueMessage>(jsonMessage, options);
            if (item == null || string.IsNullOrEmpty(item.UniqueFileName) || item.UserId <= 0)
            {
                _logger.LogError($"Invalid queue message format. Message: {jsonMessage}");
                throw new Exception("Invalid queue message format");
            }

            _logger.LogInformation($"Processing project file: {item.FileName} for user ID: {item.UserId}");

            // Download blob
            var blobContent = await _blobService.DownloadBlobAsync("project-files", item.UniqueFileName);

            // Extract text
            var projectText = TextExtractor.ExtractText(blobContent, item.FileType ?? "");
            projectText = TextExtractor.TruncateText(projectText);

            _logger.LogInformation($"Extracted {projectText.Length} characters from project file");

            // Analyze with OpenAI
            var prompt = $@"You are an assistant that extracts structured project information from documents. Read the following project document and return STRICT JSON with these fields:

{{
    ""projects"": [
        {{
            ""title"": string,
            ""company"": string,
            ""role"": string,
            ""description"": string,
            ""startDate"": ""YYYY-MM-DD"" or null,
            ""endDate"": ""YYYY-MM-DD"" or null,
            ""isCurrentJob"": boolean,
            ""technologies"": [
                {{
                    ""name"": string,
                    ""category"": ""Frontend"" | ""Backend"" | ""Mobile"" | ""Design"" | ""AR/VR"" | ""Database"" | ""DevOps"" | ""Other""
                }}
            ]
        }}
    ]
}}

Important rules:
- Extract ALL projects mentioned in the document
- If dates are vague (e.g., ""2023""), use first day of year/month as default
- Set isCurrentJob to true if project is ongoing or mentions ""present"", ""current"", etc.
- Categorize each technology appropriately
- Include all mentioned technologies, frameworks, tools, and platforms
- If information is missing, use null for strings and empty arrays for lists
- Return ONLY valid JSON, no markdown formatting

Project Document:
{projectText}";

            var analysisResult = await _openAIService.GenerateStructuredResponseAsync<ProjectAnalysisResult>(prompt, 0.1f);

            if (analysisResult == null || analysisResult.Projects == null)
            {
                throw new Exception("Failed to parse project analysis result");
            }

            _logger.LogInformation($"Successfully analyzed project file, found {analysisResult.Projects.Count} projects");

            // Store in database
            var projectsAdded = 0;
            var technologiesAdded = 0;

            foreach (var project in analysisResult.Projects)
            {
                try
                {
                    var projectId = await _databaseService.InsertProjectAsync(
                        item.UserId,
                        project.Title ?? "Untitled Project",
                        project.Company ?? "Unknown",
                        project.Role,
                        project.Description,
                        project.StartDate,
                        project.EndDate,
                        project.IsCurrentJob);

                    projectsAdded++;
                    _logger.LogInformation($"Inserted project: {project.Title} (ID: {projectId})");

                    // Insert technologies
                    if (project.Technologies != null)
                    {
                        foreach (var tech in project.Technologies)
                        {
                            try
                            {
                                await _databaseService.InsertTechnologyAsync(
                                    projectId,
                                    tech.Name ?? "Unknown",
                                    tech.Category ?? "Other");
                                technologiesAdded++;
                            }
                            catch (Exception techEx)
                            {
                                _logger.LogError(techEx, $"Error adding technology {tech.Name}");
                            }
                        }
                    }
                }
                catch (Exception projectEx)
                {
                    _logger.LogError(projectEx, $"Error adding project {project.Title}");
                }
            }

            _logger.LogInformation($"Processing completed: {projectsAdded} projects added, {technologiesAdded} technologies added");

            // Queue for reindexing if projects were added
            if (projectsAdded > 0)
            {
                await _queueService.SendMessageAsync("cv-indexing-queue", new IndexingQueueMessage { UserId = item.UserId });
                _logger.LogInformation($"Queued user {item.UserId} for AI Search reindexing");
            }

            await _activityLogService.AddActivityLogAsync(
                "processing",
                "Project Processing Completed",
                $"Successfully processed {item.FileName}. Added {projectsAdded} project(s) and {technologiesAdded} technologies.",
                "completed",
                new
                {
                    userId = item.UserId,
                    fileName = item.FileName,
                    projectsAdded,
                    technologiesAdded
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing project file");

            await _activityLogService.AddActivityLogAsync(
                "error",
                "Project Processing Failed",
                $"Failed to process project file: {ex.Message}",
                "failed",
                new { error = ex.Message, stack = ex.StackTrace });

            throw;
        }
    }
}


