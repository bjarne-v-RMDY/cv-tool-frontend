# 🚀 Getting Started with CV Tool Slack Bot

Congratulations! The Slack bot has been fully implemented. Here's how to get it running.

## 📋 What You Have

A complete, production-ready Slack bot with:

✅ **6 Slash Commands**
- `/upload-cv` - Upload CVs
- `/upload-project` - Upload project documents
- `/upload-vacancy` - Upload job vacancies
- `/chat` - Search candidates with AI
- `/match-vacancy` - Match candidates to vacancies
- `/link-user` - Link Slack users (admin)

✅ **Smart Features**
- Automatic user mapping by email
- 15-minute temporary upload links
- AI-powered candidate search
- Real-time vacancy matching
- Interactive Slack UI components

✅ **Production-Ready**
- Docker containerization
- Azure deployment scripts
- Health monitoring
- Comprehensive documentation

## 🎯 Quick Start (Choose One Path)

### Path A: Local Testing (Recommended First)

**Time: ~10 minutes**

1. **Prerequisites**
   - Node.js 20+
   - Access to CV Tool database
   - Slack workspace

2. **Follow the Guide**
   ```bash
   cd slack-bot
   open QUICKSTART.md
   ```
   This guide walks you through:
   - Creating a test Slack app
   - Setting up environment
   - Using ngrok for webhooks
   - Testing all commands

3. **Test Everything**
   - Run `npm run dev`
   - Try each command in Slack
   - Verify uploads work
   - Test candidate search

### Path B: Deploy to Azure (Production)

**Time: ~30 minutes**

1. **Prerequisites**
   - Azure CLI configured
   - Docker installed
   - Production Slack app created

2. **Follow the Guide**
   ```bash
   cd slack-bot
   open DEPLOYMENT_GUIDE.md
   ```
   This guide covers:
   - Database setup
   - Environment configuration
   - Azure Container Apps deployment
   - Slack app configuration
   - Monitoring and troubleshooting

3. **Deploy**
   ```bash
   ./deploy.sh
   ```

## 📚 Documentation Structure

```
slack-bot/
├── GET_STARTED.md          ← You are here
├── QUICKSTART.md           ← 10-min local setup
├── DEPLOYMENT_GUIDE.md     ← Azure deployment
├── README.md               ← Complete documentation
└── slack-app-manifest.yaml ← Slack app config
```

**Root folder:**
```
SLACKBOT_IMPLEMENTATION.md  ← Technical details & architecture
```

## 🔑 Key Files

### Configuration
- `slack-bot/.env` - Environment variables (create from .env.example)
- `slack-bot/slack-app-manifest.yaml` - Slack app setup

### Database
- `db/slack-user-mapping-table.sql` - Run this first!

### Deployment
- `slack-bot/deploy.sh` - Azure deployment script
- `slack-bot/Dockerfile` - Container image

### Web Integration
- `app/upload/page.tsx` - Upload page for temp links

## 🎬 Recommended Flow

1. **Read the Overview** (5 min)
   - `SLACKBOT_IMPLEMENTATION.md` - Understand what was built

2. **Test Locally** (30 min)
   - `QUICKSTART.md` - Get it running on your machine
   - Verify all features work

3. **Deploy to Azure** (1 hour)
   - `DEPLOYMENT_GUIDE.md` - Production deployment
   - Configure Slack app
   - Test with team

4. **Reference as Needed**
   - `README.md` - Complete bot documentation

## ⚙️ Environment Variables Needed

Create `slack-bot/.env`:

```env
# From Slack App (create at api.slack.com)
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Your CV Tool URL
CV_TOOL_BASE_URL=http://localhost:3000  # or Azure URL

# Azure Storage (from CV Tool project)
azure_storage_connection_string=DefaultEndpointsProtocol=https;...

# Azure SQL (from CV Tool project)
db_server=your-server.database.windows.net
db_database=your-database
db_user=your-user
db_password=your-password
```

## 🗄️ Database Setup

**IMPORTANT:** Run this SQL first:

```bash
# Connect to your Azure SQL Database
# Execute: db/slack-user-mapping-table.sql
```

This creates:
- `SlackUsers` table (user mappings)
- `TempUploadLinks` table (temporary upload links)

## 🧪 Testing Checklist

Local testing:
- [ ] Bot starts without errors
- [ ] Health endpoint responds: `curl http://localhost:3001/health`
- [ ] Database connection works
- [ ] `/upload-cv` generates upload link
- [ ] `/chat` searches candidates
- [ ] `/match-vacancy` finds matches
- [ ] User mapping works

Production testing:
- [ ] Azure deployment succeeds
- [ ] Slack commands respond
- [ ] Files upload to Azure Storage
- [ ] Azure Functions process files
- [ ] Search returns results
- [ ] Team members can use all features

## 🆘 Getting Help

1. **Local Issues**
   - Check terminal logs
   - Verify `.env` variables
   - Test database connection
   - Review `QUICKSTART.md` troubleshooting

2. **Deployment Issues**
   - Check Azure Portal logs
   - Verify environment variables in Azure
   - Test health endpoint
   - Review `DEPLOYMENT_GUIDE.md` troubleshooting

3. **Slack Issues**
   - Verify Slack app URLs
   - Check bot token scopes
   - Test request signing
   - Review Slack API docs

## 📦 What's Included

### Commands (6 files)
- Upload CV, Project, Vacancy
- Chat search
- Vacancy matching
- User linking

### Services (3 files)
- User mapping with auto-email match
- Temporary upload links with SAS tokens
- CV Tool API integration

### Interactive Components (1 file)
- User selection dropdowns
- Confirmation dialogs
- Action buttons

### Infrastructure
- Express server with Slack Bolt
- Database connection pooling
- Health monitoring
- Graceful shutdown
- Automatic cleanup jobs

## 🎯 Next Steps

1. **Choose your path** (Local or Azure)
2. **Follow the appropriate guide**
3. **Test all features**
4. **Share with your team**

## 💡 Pro Tips

- Start with local development using ngrok
- Test each command individually before moving to production
- Keep your `.env` file secure (it's git-ignored)
- Monitor Azure logs during initial deployment
- Share the `README.md` with your team

## 🚢 Ready to Deploy?

```bash
# Local testing
cd slack-bot
npm install
npm run dev
# Then use ngrok and follow QUICKSTART.md

# Production deployment
cd slack-bot
./deploy.sh
# Then follow DEPLOYMENT_GUIDE.md
```

## 📖 Full Documentation

For complete technical details, architecture, and integration points:
- Open `SLACKBOT_IMPLEMENTATION.md` in the root folder

## 🎉 You're Ready!

Everything is built and ready to go. Pick your starting point:

- **New to Slack bots?** → Start with `QUICKSTART.md`
- **Ready to deploy?** → Go to `DEPLOYMENT_GUIDE.md`
- **Want technical details?** → Read `SLACKBOT_IMPLEMENTATION.md`
- **Need command reference?** → Check `README.md`

Good luck! 🚀

---

**Questions?** All documentation is in the `slack-bot/` folder. Start with the guide that matches your goal.

