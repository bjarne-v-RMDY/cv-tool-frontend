#!/bin/bash

# Isolated Azure Functions Deployment
echo "🚀 Deploying Azure Functions (isolated from parent project)..."

# Ensure we're in the azure directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📍 Working directory: $(pwd)"

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Install dependencies (isolated)
echo "📦 Installing dependencies..."
npm install

# Build
echo "🔨 Building TypeScript..."
npm run build

# Verify build
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build successful!"
echo "📂 Dist contents:"
ls -la dist/

# Prepare deployment structure (Azure expects files at root)
echo "📦 Preparing deployment structure..."
rm -rf deploy_temp deploy.zip
mkdir -p deploy_temp

# Copy compiled files to root of deployment
cp -r dist/* deploy_temp/
cp host.json deploy_temp/
cp package.json deploy_temp/

# Create zip from the temp directory
cd deploy_temp
zip -r ../deploy.zip . -x "*.map"
cd ..

echo "📦 Package size: $(du -h deploy.zip | cut -f1)"

# Deploy using zip
echo "☁️  Deploying to Azure..."
az functionapp deployment source config-zip \
    --resource-group az-rg-rmdy-cv-agent \
    --name cvtool-functions \
    --src deploy.zip \
    --build-remote

echo "✅ Deployment completed!"
echo ""
echo "💡 View logs: az webapp log tail --name cvtool-functions --resource-group az-rg-rmdy-cv-agent"

# Clean up
rm -f deploy.zip
rm -rf deploy_temp

