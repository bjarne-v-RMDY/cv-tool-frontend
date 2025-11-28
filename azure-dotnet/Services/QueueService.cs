using Azure.Storage.Queues;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;

namespace CVToolFunctions.Services;

public class QueueService
{
    private readonly QueueServiceClient _queueServiceClient;
    private readonly ILogger<QueueService> _logger;

    public QueueService(IConfiguration configuration, ILogger<QueueService> logger)
    {
        var connectionString = configuration["azure_storage_connection_string"] 
                             ?? configuration["AzureWebJobsStorage"];
        _queueServiceClient = new QueueServiceClient(connectionString);
        _logger = logger;
    }

    public async Task SendMessageAsync<T>(string queueName, T message)
    {
        try
        {
            var queueClient = _queueServiceClient.GetQueueClient(queueName);
            await queueClient.CreateIfNotExistsAsync();

            var json = JsonSerializer.Serialize(message);
            var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
            
            await queueClient.SendMessageAsync(base64);
            _logger.LogInformation($"Message sent to queue {queueName}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error sending message to queue {queueName}");
            throw;
        }
    }
}


