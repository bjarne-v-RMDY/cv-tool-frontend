# Slack Bot Deployment Guide - Updated for Your Azure Setup

This guide will deploy the CV Tool Slack Bot to Azure Container Apps using your existing infrastructure.

## Prerequisites

- ✅ Azure CLI installed
- ✅ Docker installed  
- ✅ Slack workspace admin access
- ✅ Azure resources (SQL Database, Storage Account) already configured

## Quick Start - Complete Deployment in 5 Steps

### Step 1: Create Slack App (5 minutes)

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From an app manifest"
3. Select your workspace
4. Copy contents of `slack-app-manifest.yaml` and paste it
5. Click "Next" → "Create"

**Get your credentials:**
- Go to "OAuth & Permissions" → Click "Install to Workspace"
- Copy **Bot User OAuth Token** (starts with `xoxb-`)
- Go to "Basic Information" → Copy **Signing Secret**

### Step 2: Configure Environment Variables

Create a `.env` file in the `slack-bot` directory:

```bash
cd slack-bot
cat > .env << 'EOF'
# Slack Credentials (from Step 1)
SLACK_BOT_TOKEN=xoxb-YOUR-BOT-TOKEN
SLACK_SIGNING_SECRET=YOUR-SIGNING-SECRET

# CV Tool Configuration (your existing setup)
CV_TOOL_BASE_URL=https://cvtool-app.whitedune-f582cade.francecentral.azurecontainerapps.io

# Azure Storage (from your secres.json)
azure_storage_connection_string=DefaultEndpointsProtocol=https;AccountName=cvtoolstorage;AccountKey=6wY5XB71n5tYvax7jrxLRjqVuUCEObGx46zHmoUq4l4xcoMrZk6bjm2oQ4NxA3DcViBSpIMPbAZB+AStH2MtPA==;EndpointSuffix=core.windows.net

# Database (from your secres.json)
db_server=cvtool-sql-server.database.windows.net
db_database=cvtool-db
db_user=cvtooladmin
db_password=Sql_Server_Rmdy_Admin_eHsZFUCqABxN

# Optional
NODE_ENV=production
PORT=3001
EOF
```

**⚠️ Important:** Replace `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` with your actual values from Step 1.

### Step 3: Setup Database Tables (2 minutes)

Run the SQL script to create necessary tables:

```bash
# Connect to your Azure SQL Database and run:
# /Users/bjarneverdonck/RMDY/projects/cv-tool/cv-tool-frontend/db/slack-user-mapping-table.sql
```

Or using Azure CLI:

```bash
az sql db query \
  --server cvtool-sql-server \
  --database cvtool-db \
  --authentication-type ActiveDirectoryPassword \
  --name cvtooladmin \
  --password 'Sql_Server_Rmdy_Admin_eHsZFUCqABxN' \
  --query-file ../db/slack-user-mapping-table.sql
```

### Step 4: Deploy to Azure (10 minutes)

Run the deployment script with full configuration:

```bash
cd slack-bot
./deploy-with-secrets.sh
```

This script will:
- ✅ Build Docker image
- ✅ Push to Azure Container Registry
- ✅ Deploy to Container Apps
- ✅ Configure all secrets and environment variables
- ✅ Output the app URL

**Expected output:**
```
================================================
✅ Deployment Complete!
================================================

📍 App URL: https://cvtool-slackbot.XXXXX.francecentral.azurecontainerapps.io
🔔 Health Check: https://cvtool-slackbot.XXXXX.francecentral.azurecontainerapps.io/health
🔗 Slack Events URL: https://cvtool-slackbot.XXXXX.francecentral.azurecontainerapps.io/slack/events
```

### Step 5: Configure Slack App URLs (3 minutes)

Go back to https://api.slack.com/apps → Your App

1. **Interactivity & Shortcuts:**
   - Enable Interactivity
   - Request URL: `https://YOUR-APP-URL/slack/events`
   - Save Changes

2. **Slash Commands:**
   For each command, update Request URL to: `https://YOUR-APP-URL/slack/events`
   - `/upload-cv`
   - `/upload-project`
   - `/upload-vacancy`
   - `/chat`
   - `/chat-clear`
   - `/match-vacancy`
   - `/link-user`

3. **Event Subscriptions (Optional):**
   - Enable Events
   - Request URL: `https://YOUR-APP-URL/slack/events`
   - Verify (should get green checkmark)

### Step 6: Test! (1 minute)

In your Slack workspace:

```
/upload-cv
```

You should receive a message with an upload link! 🎉

## Architecture Overview

```
Slack Workspace
      ↓
Slack Bot (Container Apps)
      ↓
   ┌──┴──┐
   ↓     ↓
SQL DB   Azure Storage
   ↓
CV Tool Frontend
   ↓
Azure Functions (.NET)
   ↓
Azure AI Search
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/upload-cv` | Generate temporary link to upload CV |
| `/upload-project` | Upload project experience document |
| `/upload-vacancy` | Upload job vacancy description |
| `/chat` | Start AI conversation about candidates |
| `/chat-clear` | Clear chat context/history |
| `/match-vacancy` | Find matching candidates for a vacancy |
| `/link-user` | Link Slack user to CV Tool user |

## Configuration Reference

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SLACK_BOT_TOKEN` | ✅ | Slack Bot OAuth Token | `xoxb-...` |
| `SLACK_SIGNING_SECRET` | ✅ | Slack Signing Secret | `abc123...` |
| `CV_TOOL_BASE_URL` | ✅ | CV Tool Frontend URL | `https://cvtool-app...` |
| `azure_storage_connection_string` | ✅ | Azure Storage connection | `DefaultEndpoints...` |
| `db_server` | ✅ | SQL Server hostname | `cvtool-sql-server...` |
| `db_database` | ✅ | Database name | `cvtool-db` |
| `db_user` | ✅ | Database username | `cvtooladmin` |
| `db_password` | ✅ | Database password | `***` |
| `NODE_ENV` | ⚪ | Environment | `production` |
| `PORT` | ⚪ | HTTP port | `3001` |

### Resource Configuration

Your Azure resources (already set up):

| Resource | Value |
|----------|-------|
| Resource Group | `cv-tool-rg` |
| Location | `francecentral` |
| SQL Server | `cvtool-sql-server.database.windows.net` |
| Database | `cvtool-db` |
| Storage Account | `cvtoolstorage` |
| Container Registry | `cvtoolregistry` |
| Frontend | `cvtool-app` |

## Troubleshooting

### Health check fails

```bash
# Check if app is running
az containerapp show \
  --name cvtool-slackbot \
  --resource-group cv-tool-rg \
  --query "properties.runningStatus"

# View logs
az containerapp logs show \
  --name cvtool-slackbot \
  --resource-group cv-tool-rg \
  --follow
```

### Slack commands don't work

1. **Check Event URL is verified:**
   - Go to Slack App → Event Subscriptions
   - Should show green checkmark
   
2. **Check logs for errors:**
   ```bash
   az containerapp logs show \
     --name cvtool-slackbot \
     --resource-group cv-tool-rg \
     --tail 50
   ```

3. **Verify environment variables:**
   ```bash
   az containerapp show \
     --name cvtool-slackbot \
     --resource-group cv-tool-rg \
     --query "properties.template.containers[0].env"
   ```

### Database connection errors

Add your local IP to SQL firewall:

```bash
# Get your IP
MY_IP=$(curl -s ifconfig.me)

# Add firewall rule
az sql server firewall-rule create \
  --resource-group cv-tool-rg \
  --server cvtool-sql-server \
  --name AllowMyIP \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP
```

### Upload links don't work

Verify blob containers exist:

```bash
# List containers
az storage container list \
  --connection-string "YOUR_CONNECTION_STRING" \
  --output table

# Create if missing
az storage container create \
  --name cv-files \
  --connection-string "YOUR_CONNECTION_STRING"
```

## Updating the Bot

### Deploy New Version

```bash
cd slack-bot
git pull
./deploy-with-secrets.sh
```

### View Deployment History

```bash
az containerapp revision list \
  --name cvtool-slackbot \
  --resource-group cv-tool-rg \
  --output table
```

### Rollback

```bash
# Get revision name from list above
az containerapp revision activate \
  --name cvtool-slackbot \
  --resource-group cv-tool-rg \
  --revision <revision-name>
```

## Monitoring

### View Real-time Logs

```bash
az containerapp logs show \
  --name cvtool-slackbot \
  --resource-group cv-tool-rg \
  --follow
```

### Check Metrics

```bash
# CPU/Memory usage
az monitor metrics list \
  --resource $(az containerapp show \
    --name cvtool-slackbot \
    --resource-group cv-tool-rg \
    --query id -o tsv) \
  --metric "CpuPercentage,MemoryPercentage" \
  --output table
```

### Container App Status

```bash
az containerapp show \
  --name cvtool-slackbot \
  --resource-group cv-tool-rg \
  --query "{Status:properties.runningStatus, URL:properties.configuration.ingress.fqdn, Replicas:properties.template.scale}"
```

## Security Best Practices

- ✅ Secrets stored as Container App secrets (not plain env vars)
- ✅ HTTPS only (enforced by Container Apps)
- ✅ Slack signature verification enabled
- ✅ Database connection encrypted
- ✅ SAS tokens expire after 15 minutes
- ✅ Regular Docker image updates

## Cost Estimate

**Monthly costs (approximate):**
- Container Apps: ~€5-10 (0.5 vCPU, 1GB RAM, low traffic)
- Container Registry: ~€5 (Basic tier, 10GB storage)
- **Total: ~€10-15/month**

(SQL Database and Storage costs shared with main CV Tool)

## Support & Maintenance

### Cleanup Old Data

```sql
-- Remove expired upload links (automatic every 5 minutes)
DELETE FROM TempUploadLinks 
WHERE ExpiresAt < GETDATE() AND UsedAt IS NULL
```

### Check Database Tables

```sql
-- View Slack user mappings
SELECT * FROM SlackUsers

-- View recent upload links
SELECT TOP 10 * FROM TempUploadLinks 
ORDER BY CreatedAt DESC
```

## Next Steps

1. ✅ Deploy the bot
2. ✅ Test all commands
3. ⚪ Set up monitoring alerts
4. ⚪ Configure auto-scaling rules
5. ⚪ Add Application Insights (optional)
6. ⚪ Create team documentation

## Additional Resources

- [Slack Bolt SDK](https://slack.dev/bolt-js/)
- [Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/)
- [Slack API Documentation](https://api.slack.com/)

---

**Need Help?** Check logs first, then review Slack App configuration.

**Questions?** Contact the RMDY development team.

