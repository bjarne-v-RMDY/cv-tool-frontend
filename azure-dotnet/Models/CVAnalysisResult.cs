namespace CVToolFunctions.Models;

public class CVAnalysisResult
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public string? LinkedInProfile { get; set; }
    public string? Summary { get; set; }
    public int YearsOfExperience { get; set; }
    public string? Seniority { get; set; }
    public Skills? Skills { get; set; }
    public List<string>? Tools { get; set; }
    public List<string>? LanguagesSpoken { get; set; }
    public List<NotableProject>? NotableProjects { get; set; }
    public List<string>? Certifications { get; set; }
    public List<string>? PreferredRoles { get; set; }
    public string? PortfolioURL { get; set; }
    public string? GithubProfile { get; set; }
    public string? BehanceProfile { get; set; }
}

public class Skills
{
    public List<string>? Web { get; set; }
    public List<string>? Mobile { get; set; }
    public List<string>? Uiux { get; set; }
    public List<string>? Arvr { get; set; }
    public List<string>? Other { get; set; }
}

public class NotableProject
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public List<string>? Technologies { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? Role { get; set; }
    public string? Company { get; set; }
}


