using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace CVToolFunctions.Services;

public class ActivityLogService
{
    private readonly DatabaseService _databaseService;
    private readonly ILogger<ActivityLogService> _logger;

    public ActivityLogService(DatabaseService databaseService, ILogger<ActivityLogService> logger)
    {
        _databaseService = databaseService;
        _logger = logger;
    }

    public async Task AddActivityLogAsync(string type, string title, string description, string status = "processing", object? metadata = null)
    {
        try
        {
            using var connection = await _databaseService.GetConnectionAsync();
            using var command = new SqlCommand(
                @"INSERT INTO ActivityLog (Type, Title, Description, Status, Metadata) 
                  VALUES (@Type, @Title, @Description, @Status, @Metadata)", 
                connection);
            
            command.Parameters.AddWithValue("@Type", type);
            command.Parameters.AddWithValue("@Title", title);
            command.Parameters.AddWithValue("@Description", description);
            command.Parameters.AddWithValue("@Status", status);
            command.Parameters.AddWithValue("@Metadata", metadata != null ? JsonSerializer.Serialize(metadata) : DBNull.Value);

            await command.ExecuteNonQueryAsync();
            _logger.LogInformation($"Activity log added: {type} - {title}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding activity log");
            // Don't throw - activity logging shouldn't break the main process
        }
    }
}


