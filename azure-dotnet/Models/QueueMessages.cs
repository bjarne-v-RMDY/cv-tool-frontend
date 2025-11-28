namespace CVToolFunctions.Models;

public class CVQueueMessage
{
    public string? UniqueFileName { get; set; }
    public string? FileName { get; set; }
    public string? FileType { get; set; }
    public string? BlobUrl { get; set; }
    public long FileSize { get; set; }
}

public class ProjectQueueMessage
{
    public string? UniqueFileName { get; set; }
    public string? FileName { get; set; }
    public string? FileType { get; set; }
    public string? BlobUrl { get; set; }
    public long FileSize { get; set; }
    public int UserId { get; set; }
}

public class VacancyQueueMessage
{
    public string? UniqueFileName { get; set; }
    public string? FileName { get; set; }
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


