using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CVToolFunctions.Services;

public class DatabaseService
{
    private readonly string _connectionString;
    private readonly ILogger<DatabaseService> _logger;

    public DatabaseService(IConfiguration configuration, ILogger<DatabaseService> logger)
    {
        var server = configuration["azure_sql_server"];
        var database = configuration["azure_sql_database"];
        var user = configuration["azure_sql_user"];
        var password = configuration["azure_sql_password"];

        _connectionString = $"Server=tcp:{server},1433;Initial Catalog={database};Persist Security Info=False;User ID={user};Password={password};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;";
        _logger = logger;
    }

    public async Task<SqlConnection> GetConnectionAsync()
    {
        var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }

    public async Task<int?> FindUserByEmailAsync(string email)
    {
        try
        {
            using var connection = await GetConnectionAsync();
            using var command = new SqlCommand("SELECT Id FROM Users WHERE Email = @Email", connection);
            command.Parameters.AddWithValue("@Email", email);

            var result = await command.ExecuteScalarAsync();
            return result != null ? Convert.ToInt32(result) : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error finding user by email");
            throw;
        }
    }

    public async Task<int> CreateUserAsync(string name, string email, string? phone, string? location, string? linkedIn)
    {
        try
        {
            using var connection = await GetConnectionAsync();
            using var command = new SqlCommand(
                @"INSERT INTO Users (Name, Email, Phone, Location, LinkedInProfile) 
                  OUTPUT INSERTED.Id 
                  VALUES (@Name, @Email, @Phone, @Location, @LinkedIn)", 
                connection);
            
            command.Parameters.AddWithValue("@Name", name);
            command.Parameters.AddWithValue("@Email", email);
            command.Parameters.AddWithValue("@Phone", (object?)phone ?? DBNull.Value);
            command.Parameters.AddWithValue("@Location", (object?)location ?? DBNull.Value);
            command.Parameters.AddWithValue("@LinkedIn", (object?)linkedIn ?? DBNull.Value);

            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result!);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user");
            throw;
        }
    }

    public async Task UpdateUserAsync(int userId, string name, string? phone, string? location, string? linkedIn)
    {
        try
        {
            using var connection = await GetConnectionAsync();
            using var command = new SqlCommand(
                @"UPDATE Users 
                  SET Name = @Name, Phone = @Phone, Location = @Location, LinkedInProfile = @LinkedIn, UpdatedAt = GETUTCDATE() 
                  WHERE Id = @UserId", 
                connection);
            
            command.Parameters.AddWithValue("@UserId", userId);
            command.Parameters.AddWithValue("@Name", name);
            command.Parameters.AddWithValue("@Phone", (object?)phone ?? DBNull.Value);
            command.Parameters.AddWithValue("@Location", (object?)location ?? DBNull.Value);
            command.Parameters.AddWithValue("@LinkedIn", (object?)linkedIn ?? DBNull.Value);

            await command.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user");
            throw;
        }
    }

    public async Task DeleteUserProjectsAsync(int userId)
    {
        try
        {
            using var connection = await GetConnectionAsync();
            using var command = new SqlCommand("DELETE FROM Projects WHERE UserId = @UserId", connection);
            command.Parameters.AddWithValue("@UserId", userId);
            await command.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user projects");
            throw;
        }
    }

    public async Task DeleteUserDynamicFieldsAsync(int userId)
    {
        try
        {
            using var connection = await GetConnectionAsync();
            using var command = new SqlCommand("DELETE FROM UserDynamicFields WHERE UserId = @UserId", connection);
            command.Parameters.AddWithValue("@UserId", userId);
            await command.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user dynamic fields");
            throw;
        }
    }

    public async Task UpsertCVFileAsync(int userId, string fileName, string filePath, long fileSize, bool isExistingUser)
    {
        try
        {
            using var connection = await GetConnectionAsync();

            if (isExistingUser)
            {
                // Check if CV file exists
                using var checkCommand = new SqlCommand("SELECT Id FROM CVFiles WHERE UserId = @UserId", connection);
                checkCommand.Parameters.AddWithValue("@UserId", userId);
                var existingId = await checkCommand.ExecuteScalarAsync();

                if (existingId != null)
                {
                    // Update existing
                    using var updateCommand = new SqlCommand(
                        @"UPDATE CVFiles 
                          SET FileName = @FileName, FilePath = @FilePath, FileSize = @FileSize, 
                              ProcessingStatus = 'Completed', UploadDate = GETUTCDATE() 
                          WHERE Id = @Id", 
                        connection);
                    updateCommand.Parameters.AddWithValue("@Id", existingId);
                    updateCommand.Parameters.AddWithValue("@FileName", fileName);
                    updateCommand.Parameters.AddWithValue("@FilePath", filePath);
                    updateCommand.Parameters.AddWithValue("@FileSize", fileSize);
                    await updateCommand.ExecuteNonQueryAsync();
                    return;
                }
            }

            // Insert new
            using var insertCommand = new SqlCommand(
                @"INSERT INTO CVFiles (UserId, FileName, FilePath, FileSize, ProcessingStatus) 
                  VALUES (@UserId, @FileName, @FilePath, @FileSize, 'Completed')", 
                connection);
            insertCommand.Parameters.AddWithValue("@UserId", userId);
            insertCommand.Parameters.AddWithValue("@FileName", fileName);
            insertCommand.Parameters.AddWithValue("@FilePath", filePath);
            insertCommand.Parameters.AddWithValue("@FileSize", fileSize);
            await insertCommand.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upserting CV file");
            throw;
        }
    }

    public async Task<int> InsertProjectAsync(int userId, string title, string company, string? role, string? description, string? startDate, string? endDate, bool isCurrentJob = false)
    {
        try
        {
            using var connection = await GetConnectionAsync();
            using var command = new SqlCommand(
                @"INSERT INTO Projects (UserId, Title, Company, Role, Description, StartDate, EndDate, IsCurrentJob) 
                  OUTPUT INSERTED.Id 
                  VALUES (@UserId, @Title, @Company, @Role, @Description, @StartDate, @EndDate, @IsCurrentJob)", 
                connection);
            
            command.Parameters.AddWithValue("@UserId", userId);
            command.Parameters.AddWithValue("@Title", title);
            command.Parameters.AddWithValue("@Company", company);
            command.Parameters.AddWithValue("@Role", (object?)role ?? DBNull.Value);
            command.Parameters.AddWithValue("@Description", (object?)description ?? DBNull.Value);
            command.Parameters.AddWithValue("@StartDate", string.IsNullOrEmpty(startDate) ? DBNull.Value : startDate);
            command.Parameters.AddWithValue("@EndDate", string.IsNullOrEmpty(endDate) ? DBNull.Value : endDate);
            command.Parameters.AddWithValue("@IsCurrentJob", isCurrentJob);

            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result!);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error inserting project");
            throw;
        }
    }

    public async Task InsertTechnologyAsync(int projectId, string technology, string? category = null)
    {
        try
        {
            using var connection = await GetConnectionAsync();
            using var command = new SqlCommand(
                @"INSERT INTO Technologies (ProjectId, Technology, Category) 
                  VALUES (@ProjectId, @Technology, @Category)", 
                connection);
            
            command.Parameters.AddWithValue("@ProjectId", projectId);
            command.Parameters.AddWithValue("@Technology", technology);
            command.Parameters.AddWithValue("@Category", (object?)category ?? DBNull.Value);

            await command.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error inserting technology");
            throw;
        }
    }

    public async Task InsertUserDynamicFieldAsync(int userId, int fieldId, string value)
    {
        try
        {
            using var connection = await GetConnectionAsync();
            using var command = new SqlCommand(
                @"INSERT INTO UserDynamicFields (UserId, FieldId, FieldValue) 
                  VALUES (@UserId, @FieldId, @Value)", 
                connection);
            
            command.Parameters.AddWithValue("@UserId", userId);
            command.Parameters.AddWithValue("@FieldId", fieldId);
            command.Parameters.AddWithValue("@Value", value);

            await command.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error inserting user dynamic field");
            throw;
        }
    }
}


