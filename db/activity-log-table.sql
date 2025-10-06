-- Create ActivityLog table for application activity tracking
CREATE TABLE ActivityLog (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Type NVARCHAR(50) NOT NULL, -- 'upload', 'processing', 'completed', 'error', 'matching'
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    Status NVARCHAR(50) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    UserId INT NULL,
    FileName NVARCHAR(255) NULL,
    Metadata NVARCHAR(MAX) NULL, -- JSON metadata for additional data
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
);

-- Create indexes for better performance
CREATE INDEX IX_ActivityLog_Type ON ActivityLog(Type);
CREATE INDEX IX_ActivityLog_Status ON ActivityLog(Status);
CREATE INDEX IX_ActivityLog_CreatedAt ON ActivityLog(CreatedAt DESC);
CREATE INDEX IX_ActivityLog_UserId ON ActivityLog(UserId);
CREATE INDEX IX_ActivityLog_FileName ON ActivityLog(FileName);

-- Create trigger to update UpdatedAt timestamp
-- Note: Run this separately as CREATE TRIGGER must be the first statement in a batch
/*
CREATE TRIGGER TR_ActivityLog_UpdateTimestamp
ON ActivityLog
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE ActivityLog 
    SET UpdatedAt = GETUTCDATE()
    FROM ActivityLog al
    INNER JOIN inserted i ON al.Id = i.Id;
END;
*/
