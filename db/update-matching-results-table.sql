-- Migration: Enhance MatchingResults table for LLM-based matching
-- This adds columns to store detailed LLM evaluation results

-- Check and add OverallScore column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'MatchingResults') AND name = 'OverallScore')
BEGIN
    ALTER TABLE MatchingResults ADD OverallScore DECIMAL(5,2) NULL;
    PRINT 'Added OverallScore column';
END
GO

-- Check and add MatchedRequirements column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'MatchingResults') AND name = 'MatchedRequirements')
BEGIN
    ALTER TABLE MatchingResults ADD MatchedRequirements NVARCHAR(MAX) NULL;
    PRINT 'Added MatchedRequirements column';
END
GO

-- Check and add MissingRequirements column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'MatchingResults') AND name = 'MissingRequirements')
BEGIN
    ALTER TABLE MatchingResults ADD MissingRequirements NVARCHAR(MAX) NULL;
    PRINT 'Added MissingRequirements column';
END
GO

-- Check and add Reasoning column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'MatchingResults') AND name = 'Reasoning')
BEGIN
    ALTER TABLE MatchingResults ADD Reasoning NVARCHAR(MAX) NULL;
    PRINT 'Added Reasoning column';
END
GO

-- Check and add RequirementBreakdown column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'MatchingResults') AND name = 'RequirementBreakdown')
BEGIN
    ALTER TABLE MatchingResults ADD RequirementBreakdown NVARCHAR(MAX) NULL;
    PRINT 'Added RequirementBreakdown column';
END
GO

-- Check and add LastEvaluatedAt column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'MatchingResults') AND name = 'LastEvaluatedAt')
BEGIN
    ALTER TABLE MatchingResults ADD LastEvaluatedAt DATETIME2 DEFAULT GETUTCDATE();
    PRINT 'Added LastEvaluatedAt column';
END
GO

-- Check and add EvaluationVersion column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'MatchingResults') AND name = 'EvaluationVersion')
BEGIN
    ALTER TABLE MatchingResults ADD EvaluationVersion INT DEFAULT 1;
    PRINT 'Added EvaluationVersion column';
END
GO

-- Add index for LastEvaluatedAt if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'MatchingResults') AND name = 'IX_MatchingResults_LastEvaluatedAt')
BEGIN
    CREATE INDEX IX_MatchingResults_LastEvaluatedAt ON MatchingResults(LastEvaluatedAt DESC);
    PRINT 'Added IX_MatchingResults_LastEvaluatedAt index';
END
GO

-- Add index for OverallScore if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'MatchingResults') AND name = 'IX_MatchingResults_OverallScore')
BEGIN
    CREATE INDEX IX_MatchingResults_OverallScore ON MatchingResults(OverallScore DESC);
    PRINT 'Added IX_MatchingResults_OverallScore index';
END
GO

-- Update existing records to set default values
UPDATE MatchingResults 
SET 
    OverallScore = ISNULL(OverallScore, Score),
    LastEvaluatedAt = ISNULL(LastEvaluatedAt, CreatedAt),
    EvaluationVersion = ISNULL(EvaluationVersion, 0)
WHERE OverallScore IS NULL OR LastEvaluatedAt IS NULL OR EvaluationVersion IS NULL;
GO

PRINT 'MatchingResults table enhanced successfully';
GO

