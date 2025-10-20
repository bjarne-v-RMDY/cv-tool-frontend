# Slack Bot Quick Start Guide

Get the CV Tool Slack Bot running locally in under 10 minutes.

## Prerequisites

- Node.js 20+
- Access to CV Tool Azure resources (database, storage)
- Slack workspace for testing (can be a free workspace)

## Step 1: Create a Test Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. App Name: "CV Tool Bot (Dev)"
4. Select your development workspace
5. Click "Create App"

### Configure Bot

1. Go to "OAuth & Permissions"
2. Add Bot Token Scopes:
   - `commands`
   - `chat:write`
   - `users:read`
   - `users:read.email`
3. Click "Install to Workspace"
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### Get Signing Secret

1. Go to "Basic Information"
2. Copy the "Signing Secret"

## Step 2: Set Up Database

Connect to your Azure SQL Database and run:

```sql
-- Create Slack user mapping table
CREATE TABLE SlackUsers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SlackUserId NVARCHAR(50) UNIQUE NOT NULL,
    SlackEmail NVARCHAR(100),
    CVToolUserId INT NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (CVToolUserId) REFERENCES Users(Id)
);

CREATE INDEX IX_SlackUsers_SlackUserId ON SlackUsers(SlackUserId);

-- Create temporary upload links table
CREATE TABLE TempUploadLinks (
    Id NVARCHAR(50) PRIMARY KEY,
    SlackUserId NVARCHAR(50) NOT NULL,
    UploadType NVARCHAR(20) NOT NULL,
    TargetUserId INT NULL,
    BlobUrl NVARCHAR(500),
    ExpiresAt DATETIME2 NOT NULL,
    UsedAt DATETIME2 NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX IX_TempUploadLinks_ExpiresAt ON TempUploadLinks(ExpiresAt);
```

## Step 3: Configure Environment

1. Create `.env` file:
```bash
cd slack-bot
cp .env.example .env
```

2. Edit `.env`:
```env
# From Slack App
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here

# Local CV Tool
CV_TOOL_BASE_URL=http://localhost:3000

# Azure Storage (from CV Tool)
azure_storage_connection_string=DefaultEndpointsProtocol=https;AccountName=...

# Azure SQL (from CV Tool)
db_server=your-server.database.windows.net
db_database=your-database
db_user=your-user
db_password=your-password

# Local config
PORT=3001
NODE_ENV=development
```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Start the Bot

```bash
npm run dev
```

You should see:
```
✅ Configuration validated
✅ Connected to Azure SQL Database
⚡️ Slack bot is running on port 3001
📍 Environment: development
🔗 CV Tool Base URL: http://localhost:3000
```

## Step 6: Expose to Slack with ngrok

In a new terminal:

```bash
# Install ngrok if you don't have it
# macOS: brew install ngrok
# Or download from: https://ngrok.com/download

ngrok http 3001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

## Step 7: Configure Slack Commands

Go back to your Slack App:

### Add Slash Commands

1. Click "Slash Commands" → "Create New Command"
2. For each command below, use `https://your-ngrok-url.ngrok.io/slack/events`

Create these commands:
- `/upload-cv` - "Upload your CV"
- `/upload-project` - "Upload project documents"
- `/upload-vacancy` - "Upload a vacancy"
- `/chat` - "Search for candidates"
- `/match-vacancy` - "Find matching candidates"
- `/link-user` - "Link Slack user to CV Tool profile"

### Enable Interactivity

1. Click "Interactivity & Shortcuts"
2. Turn on Interactivity
3. Request URL: `https://your-ngrok-url.ngrok.io/slack/events`
4. Click "Save Changes"

## Step 8: Test!

In Slack, try these commands:

### Test 1: Upload CV
```
/upload-cv
```

Expected: You'll get a message asking you to select your profile or an upload link.

### Test 2: Search Candidates
```
/chat find React developers
```

Expected: You'll see search results with candidate information.

### Test 3: Link User (for testing)
```
/link-user @yourself 1
```

Expected: Success message linking your Slack account to CV Tool user ID 1.

### Test 4: Upload Project
```
/upload-project
```

Expected: Upload link for project documents.

### Test 5: Match Vacancy
```
/match-vacancy
```

Expected: List of vacancies to choose from, or matched candidates if you provide an ID.

## Troubleshooting

### Bot doesn't respond

Check the terminal where the bot is running for errors. Common issues:

1. **Database connection failed**
   - Verify your IP is whitelisted in Azure SQL firewall
   - Check credentials in `.env`

2. **Slack verification failed**
   - Check `SLACK_SIGNING_SECRET` is correct
   - Make sure ngrok URL is set in Slack App config

3. **Storage connection failed**
   - Check `azure_storage_connection_string` is correct
   - Verify storage account exists

### Commands timeout

1. Check CV Tool is running: `http://localhost:3000`
2. Increase timeout in Slack App settings (under "Settings" → "Socket Mode")
3. Check Azure SQL allows connections from your IP

### User mapping doesn't work

1. Verify SlackUsers table exists:
```sql
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SlackUsers'
```

2. Manually link your user:
```sql
INSERT INTO SlackUsers (SlackUserId, SlackEmail, CVToolUserId)
VALUES ('YOUR_SLACK_USER_ID', 'your@email.com', 1)
```

Get your Slack User ID by clicking your profile in Slack → "Copy member ID"

## Development Tips

### Hot Reload

The bot uses `tsx watch` so it automatically restarts when you change code.

### View Logs

All console.log output appears in the terminal where you ran `npm run dev`.

### Test Without Slack

You can test API endpoints directly:

```bash
# Health check
curl http://localhost:3001/health

# Test database connection
# Add a test endpoint in src/index.ts
```

### Debug Mode

Add more logging in `src/index.ts`:

```typescript
app.use(async ({ logger, next }) => {
  await logger.debug('Incoming request')
  await next()
})
```

## Next Steps

Once everything works locally:

1. Deploy to Azure following `DEPLOYMENT_GUIDE.md`
2. Update Slack App URLs to your Azure URL
3. Test in production
4. Share with your team!

## Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Getting Help

If you're stuck:

1. Check terminal logs for errors
2. Verify all environment variables are set
3. Test database connection manually
4. Check Slack App configuration
5. Review `README.md` for detailed information

## Resources

- [Slack Bolt SDK Docs](https://slack.dev/bolt-js/)
- [Slack API Explorer](https://api.slack.com/methods)
- [ngrok Documentation](https://ngrok.com/docs)
- [Azure SQL Quickstart](https://learn.microsoft.com/en-us/azure/azure-sql/)

Happy coding! 🚀

