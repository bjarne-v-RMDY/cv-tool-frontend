-- Create trigger to update UpdatedAt timestamp
-- Run this separately after creating the ActivityLog table
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
