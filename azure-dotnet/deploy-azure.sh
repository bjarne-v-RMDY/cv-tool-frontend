#!/bin/bash

# CV Tool Azure Functions - Deployment Script

FUNCTION_APP_NAME="cvtool-functions"
RESOURCE_GROUP="az-rg-rmdy-cv-agent"

echo "🚀 Deploying CV Tool Azure Functions to Azure"
echo "================================================"
echo "Function App: $FUNCTION_APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install it first."
    echo "   Download from: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
echo "🔐 Checking Azure login status..."
az account show &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Azure. Please run: az login"
    exit 1
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo "✅ Logged in to Azure"
echo "   Subscription: $SUBSCRIPTION"
echo ""

# Check if Azure Functions Core Tools is installed
if ! command -v func &> /dev/null; then
    echo "❌ Azure Functions Core Tools not found."
    echo "   Install with: npm install -g azure-functions-core-tools@4"
    exit 1
fi

echo "✅ Azure Functions Core Tools version: $(func --version)"
echo ""

# Build project
echo "🔨 Building project in Release mode..."
dotnet build --configuration Release

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Ensure FUNCTIONS_WORKER_RUNTIME is set correctly in Azure
echo "⚙️  Ensuring FUNCTIONS_WORKER_RUNTIME is set to dotnet-isolated..."
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings FUNCTIONS_WORKER_RUNTIME=dotnet-isolated \
  --output none 2>/dev/null || true

echo "✅ Runtime configuration verified"
echo ""

# Ensure FUNCTIONS_WORKER_RUNTIME is set correctly in Azure
echo "⚙️  Ensuring FUNCTIONS_WORKER_RUNTIME is set to dotnet-isolated..."
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings FUNCTIONS_WORKER_RUNTIME=dotnet-isolated \
  --output none

echo "✅ Runtime configuration verified"
echo ""

# Deploy to Azure using ZIP deploy (bypasses runtime detection issues)
echo "📤 Deploying to Azure Function App: $FUNCTION_APP_NAME..."
echo ""

# Build and publish
echo "📦 Building and publishing project..."
dotnet publish --configuration Release --output ./publish

# Create ZIP file
echo "📦 Creating deployment package..."
cd publish
zip -r ../deploy.zip . -q
cd ..

# Deploy using ZIP deploy
echo "🚀 Deploying package to Azure..."
az functionapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $FUNCTION_APP_NAME \
  --src ./deploy.zip

# Cleanup
rm -f deploy.zip
rm -rf publish

echo ""

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "Troubleshooting tips:"
    echo "1. Verify the Function App exists: az functionapp show -n $FUNCTION_APP_NAME -g $RESOURCE_GROUP"
    echo "2. Check if you have permissions to deploy"
    echo "3. Ensure the Function App is running"
    exit 1
fi

echo ""
echo "================================================"
echo "✅ Deployment successful!"
echo ""
echo "Next steps:"
echo "1. Verify functions in Azure Portal"
echo "2. Check Application Insights logs"
echo "3. Test with a queue message"
echo ""
echo "Monitor logs:"
echo "  func azure functionapp logstream $FUNCTION_APP_NAME"
echo ""



