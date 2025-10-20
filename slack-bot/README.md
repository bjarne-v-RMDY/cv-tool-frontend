# CV Tool Slack Bot

A Slack bot that integrates with the CV Tool web application, enabling CV uploads, project enrichment, vacancy management, candidate search, and vacancy matching directly from Slack.

## Features

- 📄 **CV Upload**: Upload and process CVs via `/upload-cv` command
- 📁 **Project Enrichment**: Add project documents to user profiles via `/upload-project` command
- 💼 **Vacancy Management**: Upload job vacancies via `/upload-vacancy` command
- 🔍 **Candidate Search**: Search candidates using AI-powered RAG via `/chat` command
- 🎯 **Vacancy Matching**: Find matching candidates for vacancies via `/match-vacancy` command
- 🔗 **User Mapping**: Automatic email-based mapping with manual override via `/link-user` command

## Commands

### `/upload-cv`
Upload your CV to the CV Tool. The bot will automatically match your Slack profile to your CV Tool profile by email, or prompt you to select your profile.

### `/upload-project [@user]`
Upload project documentation. Mention a user to upload for them, or omit to upload for yourself.

Example:
```
/upload-project @john.doe
/upload-project
```

### `/upload-vacancy`
Upload a job vacancy document. The vacancy will be analyzed and stored for candidate matching.

### `/chat <query>`
Search for candidates using natural language queries. The bot uses AI-powered semantic search to find relevant candidates.

Examples:
```
/chat find senior React developers with 5+ years experience
/chat who knows Python and machine learning
/chat show me candidates in Amsterdam
```

### `/match-vacancy [vacancy-id]`
Find candidates that match a specific vacancy. If no vacancy ID is provided, shows a list of available vacancies.

Examples:
```
/match-vacancy 123
/match-vacancy
```

### `/link-user @slack-user <cv-tool-user-id>`
Manually link a Slack user to a CV Tool user profile (admin command).

Example:
```
/link-user @john.doe 456
```

## Installation

### Prerequisites

- Node.js 20+
- Azure account with:
  - Azure Container Apps
  - Azure Container Registry
  - Azure SQL Database (shared with CV Tool)
  - Azure Storage (shared with CV Tool)
- Slack workspace with admin access

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Set up database tables:
```bash
# Run the SQL script in your Azure SQL Database
# File: /db/slack-user-mapping-table.sql
```

4. Start the development server:
```bash
npm run dev
```

5. Use ngrok for local Slack webhook testing:
```bash
ngrok http 3001
```

### Slack App Configuration

1. Create a new Slack App at https://api.slack.com/apps

2. Configure OAuth & Permissions:
   - Bot Token Scopes:
     - `commands`
     - `chat:write`
     - `users:read`
     - `users:read.email`

3. Configure Slash Commands:
   - `/upload-cv` → `https://your-app-url/slack/events`
   - `/upload-project` → `https://your-app-url/slack/events`
   - `/upload-vacancy` → `https://your-app-url/slack/events`
   - `/chat` → `https://your-app-url/slack/events`
   - `/match-vacancy` → `https://your-app-url/slack/events`
   - `/link-user` → `https://your-app-url/slack/events`

4. Configure Interactivity & Shortcuts:
   - Request URL: `https://your-app-url/slack/events`

5. Install the app to your workspace

### Azure Deployment

1. Configure environment variables in `.env`

2. Run the deployment script:
```bash
chmod +x deploy.sh
./deploy.sh
```

3. Set environment variables in Azure Portal:
   - Navigate to Container Apps → cvtool-slackbot → Configuration
   - Add secrets:
     - `SLACK_BOT_TOKEN`
     - `SLACK_SIGNING_SECRET`
     - `CV_TOOL_BASE_URL`
     - `azure_storage_connection_string`
     - `db_server`, `db_database`, `db_user`, `db_password`

4. Update Slack App URLs with your Azure Container App URL

5. Test the deployment:
```bash
curl https://your-app-url/health
```

## Architecture

### Service Components

- **Express Server**: Handles HTTP requests from Slack
- **Slack Bolt SDK**: Manages Slack interactions
- **User Mapping Service**: Links Slack users to CV Tool users
- **Temp Upload Service**: Generates temporary upload links with Azure Blob SAS tokens
- **CV Tool API Service**: Integrates with CV Tool Next.js API endpoints

### Database Tables

- **SlackUsers**: Stores Slack user to CV Tool user mappings
- **TempUploadLinks**: Tracks temporary upload links and their expiration

### Integration Flow

1. User invokes slash command in Slack
2. Slack sends request to bot's Express server
3. Bot validates user mapping (auto-map by email or prompt for selection)
4. Bot generates temporary upload link or calls CV Tool API
5. Bot sends response with upload link or search results
6. User interacts with links/buttons
7. Files are uploaded to Azure Storage
8. Azure Functions process files (CV, project, vacancy)
9. Bot receives confirmation and notifies user

## Monitoring

- Health check endpoint: `GET /health`
- Application logs in Azure Container Apps
- Activity log integration with CV Tool
- Cleanup job runs every 5 minutes to remove expired upload links

## Security

- Slack request signature verification
- Azure Blob SAS tokens with 15-minute expiry
- Temporary upload links expire after 15 minutes
- Environment variables stored as Azure secrets
- SSL/TLS encryption for all communications

## Troubleshouting

### Bot doesn't respond to commands
- Check Azure Container Apps logs
- Verify Slack App URLs are correct
- Ensure environment variables are set

### User mapping fails
- Verify Azure SQL Database connection
- Check if user exists in CV Tool Users table
- Use `/link-user` command for manual mapping

### Upload links don't work
- Check Azure Storage connection string
- Verify SAS token generation
- Check link expiration (15 minutes)

### Chat search returns no results
- Verify CV Tool API is accessible
- Check Azure AI Search configuration
- Ensure candidates are indexed

## License

Proprietary - RMDY

