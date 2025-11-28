namespace CVToolFunctions.Models;

public class VacancyAnalysisResult
{
    public VacancyInfo? Vacancy { get; set; }
}

public class VacancyInfo
{
    public string? Title { get; set; }
    public string? Client { get; set; }
    public string? Description { get; set; }
    public string? Location { get; set; }
    public string? Duration { get; set; }
    public bool RemoteWork { get; set; }
    public string? StartDate { get; set; }
    public string? Budget { get; set; }
    public List<RequirementInfo>? Requirements { get; set; }
}

public class RequirementInfo
{
    public string? Type { get; set; }
    public string? Value { get; set; }
    public bool IsRequired { get; set; }
    public int Priority { get; set; }
}


