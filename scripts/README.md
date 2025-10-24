# Development Scripts

## Quick Start All Services

### Using iTerm2 (Recommended)

Run all development services in a split-pane layout:

```bash
./scripts/dev-start.sh
```

**Layout:**
```
┌─────────────┬─────────────┬─────────────┐
│             │             │             │
│  Next.js    │  Slack Bot  │   ngrok     │
│  :3000      │  :3001      │   tunnel    │
│             │             │             │
├─────────────┼─────────────┴─────────────┤
│             │                           │
│  Azure      │      General Terminal     │
│  Functions  │                           │
│  :7071      │                           │
└─────────────┴───────────────────────────┘
```

**Services Started:**
1. **Next.js Dev Server** (Top Left) - `http://localhost:3000`
2. **Azure Functions** (Bottom Left) - `http://localhost:7071`
3. **Slack Bot** (Top Middle) - Port 3001
4. **ngrok Tunnel** (Top Right) - Public URL for Slack webhooks
5. **General Terminal** (Bottom Right) - For git, installs, etc.

### Manual Start (Individual Commands)

If you prefer to start services individually:

```bash
# Terminal 1 - Next.js
pnpm run dev

# Terminal 2 - Azure Functions
cd azure && func start

# Terminal 3 - Slack Bot
cd slack-bot && pnpm run dev

# Terminal 4 - ngrok
ngrok http 3001
```

## Requirements

- **iTerm2** - Download from [iterm2.com](https://iterm2.com)
- **Node.js/pnpm** - For Next.js and Slack Bot
- **Azure Functions Core Tools** - For Azure Functions
- **ngrok** - For Slack webhook tunneling

## Stopping Services

### Quick Stop (All Services)

```bash
./scripts/dev-stop.sh
```

This will kill all processes running on development ports:
- Port 3000 (Next.js)
- Port 7071 (Azure Functions)
- Port 3001 (Slack Bot)
- ngrok tunnel

### Manual Stop

Press `Ctrl+C` in each pane to stop the respective service, or close the entire iTerm/Terminal window.

## Troubleshooting

### "Permission denied" error
```bash
chmod +x ./scripts/dev-start.sh
```

### iTerm2 not found
Make sure iTerm2 is installed at `/Applications/iTerm.app`

### Port already in use
Kill processes using the ports:
```bash
# Kill process on port 3000 (Next.js)
lsof -ti:3000 | xargs kill -9

# Kill process on port 7071 (Azure Functions)
lsof -ti:7071 | xargs kill -9

# Kill process on port 3001 (Slack Bot)
lsof -ti:3001 | xargs kill -9
```

## Other Scripts

### Azure Functions Deployment
```bash
cd azure
./deploy-isolated.sh
```

### Slack Bot Deployment
```bash
cd slack-bot
./deploy.sh
```

