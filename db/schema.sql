CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    Phone NVARCHAR(20),
    Location NVARCHAR(100),
    LinkedInProfile NVARCHAR(200),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE Projects (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Company NVARCHAR(100) NOT NULL,
    StartDate DATE,
    EndDate DATE,
    IsCurrentJob BIT DEFAULT 0,
    Role NVARCHAR(100),
    Description NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE TABLE Technologies (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ProjectId INT NOT NULL,
    Technology NVARCHAR(100) NOT NULL,
    Category NVARCHAR(50), -- 'Frontend', 'Backend', 'Mobile', 'Design', 'AR/VR', 'Database', etc.
    Proficiency NVARCHAR(50), -- 'Beginner', 'Intermediate', 'Advanced', 'Expert'
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (ProjectId) REFERENCES Projects(Id) ON DELETE CASCADE
);

CREATE TABLE ProjectAssignments (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX),
    Client NVARCHAR(100),
    Duration NVARCHAR(100), -- '3 months', '6 months', '1 year', etc.
    Location NVARCHAR(100),
    RemoteWork BIT DEFAULT 0,
    StartDate DATE,
    Budget NVARCHAR(100),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE AssignmentRequirements (
    Id INT PRIMARY KEY IDENTITY(1,1),
    AssignmentId INT NOT NULL,
    RequirementType NVARCHAR(50), -- 'Technology', 'Role', 'Experience', 'Language', 'Certification'
    RequirementValue NVARCHAR(200) NOT NULL,
    IsRequired BIT DEFAULT 1,
    Priority INT DEFAULT 1, -- 1=High, 2=Medium, 3=Low
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (AssignmentId) REFERENCES ProjectAssignments(Id) ON DELETE CASCADE
);

CREATE TABLE MatchingResults (
    Id INT PRIMARY KEY IDENTITY(1,1),
    AssignmentId INT NOT NULL,
    UserId INT NOT NULL,
    Score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
    MatchReasoning NVARCHAR(MAX),
    TechnologyMatches INT DEFAULT 0,
    ExperienceMatches INT DEFAULT 0,
    RoleMatches INT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (AssignmentId) REFERENCES ProjectAssignments(Id) ON DELETE CASCADE,
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE TABLE CVFiles (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    FileName NVARCHAR(200) NOT NULL,
    FilePath NVARCHAR(500) NOT NULL,
    FileSize INT,
    UploadDate DATETIME2 DEFAULT GETUTCDATE(),
    ProcessingStatus NVARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Processing', 'Completed', 'Failed'
    ProcessingError NVARCHAR(MAX),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE TABLE AssignmentFiles (
    Id INT PRIMARY KEY IDENTITY(1,1),
    AssignmentId INT NOT NULL,
    FileName NVARCHAR(200) NOT NULL,
    FilePath NVARCHAR(500) NOT NULL,
    FileSize INT,
    UploadDate DATETIME2 DEFAULT GETUTCDATE(),
    ProcessingStatus NVARCHAR(50) DEFAULT 'Pending',
    ProcessingError NVARCHAR(MAX),
    FOREIGN KEY (AssignmentId) REFERENCES ProjectAssignments(Id) ON DELETE CASCADE
);

CREATE TABLE DynamicSchemaFields (
    Id INT PRIMARY KEY IDENTITY(1,1),
    FieldName NVARCHAR(100) NOT NULL,
    FieldType NVARCHAR(50) NOT NULL, -- 'String', 'Number', 'Date', 'Boolean', 'List'
    FieldCategory NVARCHAR(50), -- 'User', 'Project', 'Assignment'
    IsRequired BIT DEFAULT 0,
    DefaultValue NVARCHAR(200),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(100) DEFAULT 'System'
);

CREATE TABLE UserDynamicFields (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    FieldId INT NOT NULL,
    FieldValue NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (FieldId) REFERENCES DynamicSchemaFields(Id) ON DELETE CASCADE
);

CREATE TABLE AuditLog (
    Id INT PRIMARY KEY IDENTITY(1,1),
    TableName NVARCHAR(100) NOT NULL,
    RecordId INT NOT NULL,
    Action NVARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    OldValues NVARCHAR(MAX),
    NewValues NVARCHAR(MAX),
    UserId INT,
    Timestamp DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX IX_Projects_UserId ON Projects(UserId);
CREATE INDEX IX_Technologies_ProjectId ON Technologies(ProjectId);
CREATE INDEX IX_Technologies_Category ON Technologies(Category);
CREATE INDEX IX_AssignmentRequirements_AssignmentId ON AssignmentRequirements(AssignmentId);
CREATE INDEX IX_MatchingResults_AssignmentId ON MatchingResults(AssignmentId);
CREATE INDEX IX_MatchingResults_UserId ON MatchingResults(UserId);
CREATE INDEX IX_MatchingResults_Score ON MatchingResults(Score DESC);
CREATE INDEX IX_CVFiles_UserId ON CVFiles(UserId);
CREATE INDEX IX_CVFiles_ProcessingStatus ON CVFiles(ProcessingStatus);
CREATE INDEX IX_AssignmentFiles_AssignmentId ON AssignmentFiles(AssignmentId);
CREATE INDEX IX_AuditLog_TableName ON AuditLog(TableName);
CREATE INDEX IX_AuditLog_Timestamp ON AuditLog(Timestamp);

INSERT INTO DynamicSchemaFields (FieldName, FieldType, FieldCategory, IsRequired) VALUES
('ProgrammingLanguages', 'List', 'User', 0),
('DesignTools', 'List', 'User', 0),
('ARVRExperience', 'String', 'User', 0),
('MobilePlatforms', 'List', 'User', 0),
('Certifications', 'List', 'User', 0),
('Languages', 'List', 'User', 0),
('YearsOfExperience', 'Number', 'User', 0),
('PortfolioURL', 'String', 'User', 0),
('GitHubProfile', 'String', 'User', 0),
('BehanceProfile', 'String', 'User', 0);