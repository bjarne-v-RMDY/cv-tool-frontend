# Slack Bot Deployment Guide

This guide will walk you through deploying the CV Tool Slack Bot to Azure Container Apps and configuring it with Slack.

## Prerequisites

- Azure CLI installed and configured
- Docker installed
- Slack workspace admin access
- Access to CV Tool Azure resources

## Step 1: Database Setup

1. Connect to your Azure SQL Database
2. Run the SQL script to create necessary tables:

```bash
# Use Azure Data Studio or SQL Server Management Studio
# Execute: /db/slack-user-mapping-table.sql
```

This creates:
- `SlackUsers` table for user mappings
- `TempUploadLinks` table for temporary upload links

## Step 2: Configure Environment Variables

1. Copy the example environment file:
```bash
cd slack-bot
cp .env.example .env
```

2. Edit `.env` with your values:
```env
# Get from Slack App (create in Step 3)
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-signing-secret

# Your CV Tool URL
CV_TOOL_BASE_URL=https://your-cvtool.azurewebsites.net

# Azure Storage (same as CV Tool)
azure_storage_connection_string=your-connection-string

# Azure SQL (same as CV Tool)
db_server=your-server.database.windows.net
db_database=your-database
db_user=your-user
db_password=your-password
```

## Step 3: Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From an app manifest"
3. Select your workspace
4. Copy the contents of `slack-app-manifest.yaml`
5. Paste and click "Next" → "Create"

### Get Credentials

1. Go to "OAuth & Permissions"
2. Click "Install to Workspace"
3. Copy the "Bot User OAuth Token" → This is your `SLACK_BOT_TOKEN`
4. Go to "Basic Information"
5. Copy the "Signing Secret" → This is your `SLACK_SIGNING_SECRET`

**Important:** Don't configure the request URLs yet - we'll do this after deployment.

## Step 4: Deploy to Azure

1. Make the deployment script executable:
```bash
chmod +x deploy.sh
```

2. Review and update configuration in `deploy.sh`:
```bash
# Edit these values if needed
RESOURCE_GROUP="cvtool-rg"
CONTAINER_REGISTRY="cvtoolregistry"
CONTAINER_APP_NAME="cvtool-slackbot"
```

3. Run the deployment:
```bash
./deploy.sh
```

The script will:
- Create Azure Container Registry
- Build and push Docker image
- Create Container Apps environment
- Deploy the container app
- Output the app URL

4. Note the app URL from the output:
```
App URL: https://cvtool-slackbot.xyz.azurecontainerapps.io
```

## Step 5: Configure Environment Variables in Azure

1. Go to Azure Portal
2. Navigate to Container Apps → cvtool-slackbot
3. Click "Containers" → "Environment variables"
4. Add/Update these variables:

**Required:**
- `SLACK_BOT_TOKEN` = `xoxb-your-token` (Secret)
- `SLACK_SIGNING_SECRET` = `your-signing-secret` (Secret)
- `CV_TOOL_BASE_URL` = `https://your-cvtool.azurewebsites.net`
- `azure_storage_connection_string` = `your-connection-string` (Secret)
- `db_server` = `your-server.database.windows.net`
- `db_database` = `your-database-name`
- `db_user` = `your-username`
- `db_password` = `your-password` (Secret)

**Optional:**
- `NODE_ENV` = `production`
- `PORT` = `3001`

5. Click "Save" → Container will restart automatically

## Step 6: Update Slack App URLs

Go back to your Slack App configuration:

1. **Interactivity & Shortcuts**:
   - Enable Interactivity
   - Request URL: `https://your-app-url.azurecontainerapps.io/slack/events`
   - Click "Save Changes"

2. **Slash Commands**:
   Update each command's Request URL to: `https://your-app-url.azurecontainerapps.io/slack/events`
   - `/upload-cv`
   - `/upload-project`
   - `/upload-vacancy`
   - `/chat`
   - `/match-vacancy`
   - `/link-user`

3. **Event Subscriptions** (optional):
   - Enable Events
   - Request URL: `https://your-app-url.azurecontainerapps.io/slack/events`
   - Verify the URL (should get green checkmark)

## Step 7: Test the Deployment

1. Test the health endpoint:
```bash
curl https://your-app-url.azurecontainerapps.io/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-10-15T..."}
```

2. Test in Slack:
```
/upload-cv
```

You should receive a message with an upload link.

## Step 8: Configure Scaling (Optional)

1. In Azure Portal, go to Container Apps → cvtool-slackbot
2. Click "Scale"
3. Configure scaling rules:
   - Min replicas: 1
   - Max replicas: 3
   - Scale rule: HTTP
     - Concurrent requests: 100
     - Scale up: When > 80% of 100
     - Scale down: When < 20% of 100

## Troubleshooting

### Bot doesn't respond to commands

1. Check Container App logs:
```bash
az containerapp logs show \
  --name cvtool-slackbot \
  --resource-group cvtool-rg \
  --follow
```

2. Verify environment variables are set correctly
3. Check Slack App URLs are correct
4. Verify bot is installed in workspace

### User mapping fails

1. Check database connection:
```bash
# Test from Container App console
npm run test-db
```

2. Verify SlackUsers table exists
3. Check if user exists in CV Tool Users table

### Upload links don't work

1. Verify Azure Storage connection string
2. Check SAS token generation (15-minute expiry)
3. Verify blob containers exist:
   - `cv-files`
   - `project-files`
   - `vacancy-files`

### Commands timeout

1. Increase Container App CPU/Memory:
```bash
az containerapp update \
  --name cvtool-slackbot \
  --resource-group cvtool-rg \
  --cpu 1.0 \
  --memory 2.0Gi
```

2. Check CV Tool API availability
3. Verify network connectivity between services

## Monitoring

### View Logs

```bash
# Real-time logs
az containerapp logs show \
  --name cvtool-slackbot \
  --resource-group cvtool-rg \
  --follow

# Last 100 lines
az containerapp logs show \
  --name cvtool-slackbot \
  --resource-group cvtool-rg \
  --tail 100
```

### Metrics

In Azure Portal:
1. Go to Container Apps → cvtool-slackbot
2. Click "Metrics"
3. View:
   - CPU usage
   - Memory usage
   - Request count
   - Response time
   - Replica count

### Application Insights (Optional)

Add Application Insights for detailed telemetry:

1. Create Application Insights resource
2. Add environment variable:
```
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...
```

3. Install SDK:
```bash
npm install applicationinsights
```

4. Add to `src/index.ts`:
```typescript
import * as appInsights from 'applicationinsights';
appInsights.setup().start();
```

## Updating the Bot

### Deploy New Version

```bash
# Update code
git pull

# Rebuild and deploy
cd slack-bot
./deploy.sh
```

### Rollback

```bash
# List revisions
az containerapp revision list \
  --name cvtool-slackbot \
  --resource-group cvtool-rg \
  --output table

# Activate previous revision
az containerapp revision activate \
  --name cvtool-slackbot \
  --resource-group cvtool-rg \
  --revision <revision-name>
```

## Security Checklist

- [ ] Environment variables stored as secrets
- [ ] Azure Container Registry access restricted
- [ ] Network security rules configured
- [ ] HTTPS only (enforced by Container Apps)
- [ ] Slack signing secret verification enabled
- [ ] Database firewall rules configured
- [ ] SAS token expiry set to 15 minutes
- [ ] Regular security updates applied

## Maintenance

### Cleanup Expired Links

The bot automatically cleans up expired upload links every 5 minutes. To manually trigger:

```sql
DELETE FROM TempUploadLinks
WHERE ExpiresAt < GETDATE() AND UsedAt IS NULL
```

### Monitor Database Size

```sql
-- Check table sizes
SELECT 
    t.NAME AS TableName,
    p.rows AS RowCounts,
    SUM(a.total_pages) * 8 AS TotalSpaceKB
FROM sys.tables t
INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.NAME IN ('SlackUsers', 'TempUploadLinks')
GROUP BY t.Name, p.Rows
ORDER BY t.Name
```

## Support

For issues or questions:
1. Check logs in Azure Portal
2. Review Slack App configuration
3. Verify environment variables
4. Check Azure resource health
5. Contact RMDY support team

## Additional Resources

- [Slack Bolt SDK Documentation](https://slack.dev/bolt-js/)
- [Azure Container Apps Documentation](https://learn.microsoft.com/en-us/azure/container-apps/)
- [Slack API Documentation](https://api.slack.com/)

