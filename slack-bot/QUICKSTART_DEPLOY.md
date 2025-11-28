# Slack Bot - Quick Deploy Guide

**Time to deploy: ~20 minutes**

## Prerequisites Check

```bash
# Check Azure CLI
az --version

# Check Docker
docker --version

# Login to Azure
az login
```

## Step-by-Step Deployment

### 1. Create Slack App (5 min)

1. Go to https://api.slack.com/apps
2. "Create New App" → "From an app manifest"
3. Paste `slack-app-manifest.yaml` content
4. Get credentials:
   - **Bot Token**: OAuth & Permissions → Install to Workspace
   - **Signing Secret**: Basic Information

### 2. Configure Secrets (2 min)

```bash
cd slack-bot

# Create .env file (replace YOUR_* with actual values)
cat > .env << 'EOF'
SLACK_BOT_TOKEN=xoxb-YOUR-TOKEN-HERE
SLACK_SIGNING_SECRET=YOUR-SECRET-HERE
CV_TOOL_BASE_URL=https://cvtool-app.whitedune-f582cade.francecentral.azurecontainerapps.io
azure_storage_connection_string=DefaultEndpointsProtocol=https;AccountName=cvtoolstorage;AccountKey=6wY5XB71n5tYvax7jrxLRjqVuUCEObGx46zHmoUq4l4xcoMrZk6bjm2oQ4NxA3DcViBSpIMPbAZB+AStH2MtPA==;EndpointSuffix=core.windows.net
db_server=cvtool-sql-server.database.windows.net
db_database=cvtool-db
db_user=cvtooladmin
db_password=Sql_Server_Rmdy_Admin_eHsZFUCqABxN
NODE_ENV=production
PORT=3001
EOF
```

### 3. Setup Database (2 min)

```bash
# Run this SQL script in Azure SQL:
# ../db/slack-user-mapping-table.sql
```

### 4. Deploy! (10 min)

```bash
./deploy-with-secrets.sh
```

**Save the output URL!** You'll need it in the next step.

### 5. Configure Slack URLs (3 min)

Go back to https://api.slack.com/apps → Your App

Update these with your app URL from step 4:

- **Interactivity**: `https://YOUR-URL/slack/events`
- **All Slash Commands**: `https://YOUR-URL/slack/events`
- **Event Subscriptions**: `https://YOUR-URL/slack/events`

### 6. Test

In Slack:
```
/upload-cv
```

✅ You should get an upload link!

## Common Issues

**"Configuration error"**
→ Check .env file has all variables

**"Connection refused"**
→ Wait 30 seconds for container to start, then try again

**"Invalid signing secret"**
→ Double-check SLACK_SIGNING_SECRET in .env matches Slack App

**"Database connection failed"**
→ Add your IP to SQL firewall

## View Logs

```bash
az containerapp logs show \
  --name cvtool-slackbot \
  --resource-group cv-tool-rg \
  --follow
```

## Update Deployment

```bash
git pull
cd slack-bot
./deploy-with-secrets.sh
```

---

**Full documentation:** See `DEPLOYMENT_GUIDE_UPDATED.md`

