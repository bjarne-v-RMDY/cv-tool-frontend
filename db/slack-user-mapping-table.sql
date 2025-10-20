-- Slack user mapping table
CREATE TABLE SlackUsers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SlackUserId NVARCHAR(50) UNIQUE NOT NULL,
    SlackEmail NVARCHAR(100),
    CVToolUserId INT NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (CVToolUserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX IX_SlackUsers_SlackUserId ON SlackUsers(SlackUserId);
CREATE INDEX IX_SlackUsers_CVToolUserId ON SlackUsers(CVToolUserId);
CREATE INDEX IX_SlackUsers_SlackEmail ON SlackUsers(SlackEmail);

-- Temporary upload links table
CREATE TABLE TempUploadLinks (
    Id NVARCHAR(50) PRIMARY KEY,
    SlackUserId NVARCHAR(50) NOT NULL,
    UploadType NVARCHAR(20) NOT NULL, -- 'cv', 'project', 'vacancy'
    TargetUserId INT NULL, -- For CV/project uploads
    BlobUrl NVARCHAR(500),
    ExpiresAt DATETIME2 NOT NULL,
    UsedAt DATETIME2 NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

-- Index for cleanup queries
CREATE INDEX IX_TempUploadLinks_ExpiresAt ON TempUploadLinks(ExpiresAt);
CREATE INDEX IX_TempUploadLinks_SlackUserId ON TempUploadLinks(SlackUserId);

