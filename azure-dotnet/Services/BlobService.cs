using Azure.Storage.Blobs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CVToolFunctions.Services;

public class BlobService
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly ILogger<BlobService> _logger;

    public BlobService(IConfiguration configuration, ILogger<BlobService> logger)
    {
        var connectionString = configuration["azure_storage_connection_string"];
        _blobServiceClient = new BlobServiceClient(connectionString);
        _logger = logger;
    }

    public async Task<byte[]> DownloadBlobAsync(string containerName, string blobName)
    {
        try
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
            var blobClient = containerClient.GetBlobClient(blobName);

            using var memoryStream = new MemoryStream();
            await blobClient.DownloadToAsync(memoryStream);
            return memoryStream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error downloading blob {blobName} from container {containerName}");
            throw;
        }
    }
}


