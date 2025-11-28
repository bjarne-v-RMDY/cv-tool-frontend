namespace CVToolFunctions.Models;

public class ProjectAnalysisResult
{
    public List<ProjectInfo>? Projects { get; set; }
}

public class ProjectInfo
{
    public string? Title { get; set; }
    public string? Company { get; set; }
    public string? Role { get; set; }
    public string? Description { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public bool IsCurrentJob { get; set; }
    public List<TechnologyInfo>? Technologies { get; set; }
}

public class TechnologyInfo
{
    public string? Name { get; set; }
    public string? Category { get; set; }
}


