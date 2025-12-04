#!/bin/bash

# Script to update Azure Function App Application Settings
# This ensures all required environment variables are set correctly

FUNCTION_APP_NAME="cvtool-functions"
RESOURCE_GROUP="az-rg-rmdy-cv-agent"

echo "🔧 Updating Azure Function App Application Settings"
echo "=================================================="
echo "Function App: $FUNCTION_APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install it first."
    exit 1
fi

# Check if logged in
az account show &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Azure. Please run: az login"
    exit 1
fi

echo "📋 Setting application settings..."
echo ""

# Read from local.settings.json
LOCAL_SETTINGS="local.settings.json"

if [ ! -f "$LOCAL_SETTINGS" ]; then
    echo "❌ local.settings.json not found"
    exit 1
fi

# Extract values from local.settings.json (simple parsing)
# Note: This is a basic parser - for production, use jq or similar
AZURE_OPENAI_KEY=$(grep -o '"azure_openai_key": "[^"]*"' "$LOCAL_SETTINGS" | cut -d'"' -f4)
AZURE_OPENAI_RESOURCE=$(grep -o '"azure_openai_resource": "[^"]*"' "$LOCAL_SETTINGS" | cut -d'"' -f4)
AZURE_OPENAI_DEPLOYMENT=$(grep -o '"azure_openai_deployment": "[^"]*"' "$LOCAL_SETTINGS" | cut -d'"' -f4)
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=$(grep -o '"azure_openai_embedding_deployment": "[^"]*"' "$LOCAL_SETTINGS" | cut -d'"' -f4)
AZURE_SQL_SERVER=$(grep -o '"azure_sql_server": "[^"]*"' "$LOCAL_SETTINGS" | cut -d'"' -f4)
AZURE_SQL_DATABASE=$(grep -o '"azure_sql_database": "[^"]*"' "$LOCAL_SETTINGS" | cut -d'"' -f4)
AZURE_SQL_USER=$(grep -o '"azure_sql_user": "[^"]*"' "$LOCAL_SETTINGS" | cut -d'"' -f4)
AZURE_SQL_PASSWORD=$(grep -o '"azure_sql_password": "[^"]*"' "$LOCAL_SETTINGS" | cut -d'"' -f4)
AZURE_STORAGE_CONNECTION_STRING=$(grep -o '"azure_storage_connection_string": "[^"]*"' "$LOCAL_SETTINGS" | cut -d'"' -f4)
AZURE_SEARCH_ENDPOINT=$(grep -o '"azure_search_endpoint": "[^"]*"' "$LOCAL_SETTINGS" | cut -d'"' -f4)
AZURE_SEARCH_KEY=$(grep -o '"azure_search_key": "[^"]*"' "$LOCAL_SETTINGS" | cut -d'"' -f4)
NEXT_PUBLIC_BASE_URL=$(grep -o '"next_public_base_url": "[^"]*"' "$LOCAL_SETTINGS" | cut -d'"' -f4)

# Update all settings at once
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    FUNCTIONS_WORKER_RUNTIME=dotnet-isolated \
    azure_openai_key="$AZURE_OPENAI_KEY" \
    azure_openai_resource="$AZURE_OPENAI_RESOURCE" \
    azure_openai_deployment="$AZURE_OPENAI_DEPLOYMENT" \
    azure_openai_embedding_deployment="$AZURE_OPENAI_EMBEDDING_DEPLOYMENT" \
    azure_sql_server="$AZURE_SQL_SERVER" \
    azure_sql_database="$AZURE_SQL_DATABASE" \
    azure_sql_user="$AZURE_SQL_USER" \
    azure_sql_password="$AZURE_SQL_PASSWORD" \
    azure_storage_connection_string="$AZURE_STORAGE_CONNECTION_STRING" \
    azure_search_endpoint="$AZURE_SEARCH_ENDPOINT" \
    azure_search_key="$AZURE_SEARCH_KEY" \
    next_public_base_url="$NEXT_PUBLIC_BASE_URL" \
  --output none

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Application settings updated successfully!"
    echo ""
    echo "📝 Verifying settings..."
    az functionapp config appsettings list \
      --name $FUNCTION_APP_NAME \
      --resource-group $RESOURCE_GROUP \
      --query "[?name=='azure_openai_key' || name=='azure_openai_resource'].{Name:name, Value:value}" \
      --output table
    
    echo ""
    echo "✅ Done! The function app will restart automatically."
else
    echo ""
    echo "❌ Failed to update settings"
    exit 1
fi



