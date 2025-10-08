#!/bin/bash

echo "🚀 Deploying CV Tool Azure Functions..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Create deployment package (dist + package files, exclude node_modules)
echo "📦 Creating deployment package..."
rm -f deploy.zip
zip -r deploy.zip \
  dist/ \
  host.json \
  package.json \
  package-lock.json \
  -x "*.md" "src/*" "tsconfig.json" "README.md" "local.settings.json"

echo "✅ Package created: deploy.zip"

# Deploy to Azure
echo "🚀 Deploying to Azure Functions..."
az functionapp deployment source config-zip \
  --resource-group az-rg-rmdy-cv-agent \
  --name cvtool-functions \
  --src deploy.zip \
  --build-remote

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Check logs: az functionapp log tail --resource-group az-rg-rmdy-cv-agent --name cvtool-functions"
echo "2. Test by uploading a CV in the app"
echo "3. Monitor activity log for processing events"