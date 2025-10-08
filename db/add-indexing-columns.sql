-- Add indexing metadata columns to Users table
ALTER TABLE Users ADD IsIndexed BIT DEFAULT 0;
ALTER TABLE Users ADD LastIndexedAt DATETIME NULL;
ALTER TABLE Users ADD IndexVersion INT DEFAULT 1;

