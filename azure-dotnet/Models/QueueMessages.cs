using System.Text.Json.Serialization;

namespace CVToolFunctions.Models;

public class CVQueueMessage
{
    [JsonPropertyName("uniqueFileName")]
    public string? UniqueFileName { get; set; }
    
    [JsonPropertyName("fileName")]
    public string? FileName { get; set; }
    
    [JsonPropertyName("fileType")]
    public string? FileType { get; set; }
    
    [JsonPropertyName("blobUrl")]
    public string? BlobUrl { get; set; }
    
    [JsonPropertyName("fileSize")]
    public long FileSize { get; set; }
    
    // Optional fields that may be present but aren't required
    [JsonPropertyName("uploadedAt")]
    public string? UploadedAt { get; set; }
    
    [JsonPropertyName("messageId")]
    public string? MessageId { get; set; }
}

public class ProjectQueueMessage
{
    [JsonPropertyName("uniqueFileName")]
    public string? UniqueFileName { get; set; }
    
    [JsonPropertyName("fileName")]
    public string? FileName { get; set; }
    
    [JsonPropertyName("fileType")]
    public string? FileType { get; set; }
    
    [JsonPropertyName("blobUrl")]
    public string? BlobUrl { get; set; }
    
    [JsonPropertyName("fileSize")]
    public long FileSize { get; set; }
    
    [JsonPropertyName("userId")]
    public int UserId { get; set; }
}

public class VacancyQueueMessage
{
    [JsonPropertyName("uniqueFileName")]
    public string? UniqueFileName { get; set; }
    
    [JsonPropertyName("fileName")]
    public string? FileName { get; set; }
    
    [JsonPropertyName("fileType")]
    public string? FileType { get; set; }
}

public class VacancyMatchingQueueMessage
{
    public int VacancyId { get; set; }
}

public class IndexingQueueMessage
{
    public int UserId { get; set; }
}


