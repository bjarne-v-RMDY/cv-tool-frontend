# Azure Functions Deployment Guide

## Issue: Nested NPM Projects

This Azure Functions project is nested inside a Next.js project, which can cause deployment issues. The solutions below ensure isolated deployment.

## ✅ Solution 1: Use Isolated Deployment Script (Recommended)

This script creates a clean zip package and deploys it:

```bash
cd azure
./deploy-isolated.sh
```

**What it does:**
- Cleans previous builds
- Installs dependencies in `azure/` folder only
- Builds TypeScript
- Creates a clean zip with only: `dist/`, `host.json`, `package.json`
- Deploys zip to Azure with remote build
- Excludes parent project files

## ✅ Solution 2: Manual Deployment

Step by step manual deployment:

```bash
# 1. Go to azure directory
cd azure

# 2. Clean and install
rm -rf dist node_modules
npm install

# 3. Build
npm run build

# 4. Verify build
ls -la dist/functions/

# 5. Deploy with Azure CLI (zip method)
zip -r deploy.zip dist/ host.json package.json -x "*.map"
az functionapp deployment source config-zip \
    --resource-group az-rg-rmdy-cv-agent \
    --name cvtool-functions \
    --src deploy.zip \
    --build-remote

# 6. Clean up
rm deploy.zip
```

## ✅ Solution 3: Use func CLI from azure directory

Ensure you're deploying from the `azure/` directory:

```bash
cd azure
npm run build
func azure functionapp publish cvtool-functions --build-remote
```

## File Structure

```
cvtool/                    (Root - Next.js project)
├── package.json          ← Next.js dependencies
├── node_modules/         ← Next.js modules
└── azure/                (Azure Functions project)
    ├── package.json      ← Functions dependencies
    ├── node_modules/     ← Functions modules (isolated)
    ├── dist/             ← Compiled output
    ├── src/
    │   └── functions/
    │       ├── cvProcessing.ts
    │       ├── indexCV.ts
    │       ├── projectProcessing.ts
    │       └── vacancyProcessing.ts
    └── host.json
```

## What's in .funcignore

The `.funcignore` file prevents uploading unnecessary files:

```
.git*
.vscode
local.settings.json
test
.env
*.md
src                    # TypeScript source (we only upload dist/)
tsconfig.json
deploy*.sh
node_modules           # Installed remotely on Azure
package-lock.json
../*                   # Exclude parent directory!
```

## Troubleshooting

### "Disk space" error
- ✅ Ensure `node_modules` is in `.funcignore`
- ✅ Use `--build-remote` flag

### "Timeout" error
- ✅ Don't stop/start the function app
- ✅ Don't change app settings during deployment

### Functions not appearing
- ✅ Check that all 4 functions are in `dist/functions/`:
  - cvProcessing.js
  - indexCV.js  
  - projectProcessing.js
  - vacancyProcessing.js
- ✅ Verify `src/index.ts` imports all functions

### Parent project interference
- ✅ Always `cd azure` before deploying
- ✅ Use the `deploy-isolated.sh` script
- ✅ Check `.funcignore` includes `../*`

## Verify Deployment

After deployment, check the functions are running:

```bash
# List functions
az functionapp function list \
    --name cvtool-functions \
    --resource-group az-rg-rmdy-cv-agent

# View logs
az webapp log tail \
    --name cvtool-functions \
    --resource-group az-rg-rmdy-cv-agent
```

## Expected Functions

After deployment, you should see:
1. ✅ cvProcessing (queue trigger: `cv-processing-queue`)
2. ✅ indexCV (queue trigger: `cv-indexing-queue`)
3. ✅ projectProcessing (queue trigger: `project-processing-queue`)
4. ✅ vacancyProcessing (queue trigger: `vacancy-processing-queue`)

