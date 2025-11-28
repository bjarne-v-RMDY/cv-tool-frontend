#!/bin/bash

# Update Container App Environment Variables from .env file
# This script reads .env and updates Azure Container App configuration

set -e

# Configuration
CONTAINER_APP_NAME="cvtool-app"
RESOURCE_GROUP="az-rg-rmdy-cv-agent"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔧 Updating Container App environment variables..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env file not found!${NC}"
  echo "Please create .env file in the project root with your configuration."
  echo "You can copy .env.example and fill in your values."
  exit 1
fi

# Load environment variables from .env
echo "📁 Loading configuration from .env file..."
export $(cat .env | grep -v '^#' | xargs)

# Validate required variables
REQUIRED_VARS=(
  "azure_sql_server"
  "azure_sql_database"
  "azure_sql_user"
  "azure_sql_password"
  "azure_storage_connection_string"
  "azure_openai_key"
  "azure_openai_resource"
  "azure_search_endpoint"
  "azure_search_key"
  "next_public_base_url"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}❌ Missing required variable: $var${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✅ All required variables present${NC}"
echo ""

# Login to Azure
echo "🔐 Checking Azure login..."
az account show > /dev/null 2>&1 || az login

SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${GREEN}✅ Logged in to Azure${NC}"
echo "   Subscription: $SUBSCRIPTION"
echo ""

# Update secrets first
echo "🔐 Updating secrets..."
az containerapp secret set \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --secrets \
    azure-storage-connection="$azure_storage_connection_string" \
    azure-sql-password="$azure_sql_password" \
    azure-openai-key="$azure_openai_key" \
    azure-search-key="$azure_search_key" \
  --output none

echo -e "${GREEN}✅ Secrets updated${NC}"
echo ""

# Update environment variables
echo "⚙️  Updating environment variables..."
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars \
    azure_sql_server="$azure_sql_server" \
    azure_sql_database="$azure_sql_database" \
    azure_sql_user="$azure_sql_user" \
    azure_sql_password=secretref:azure-sql-password \
    azure_storage_connection_string=secretref:azure-storage-connection \
    azure_openai_key=secretref:azure-openai-key \
    azure_openai_resource="${azure_openai_resource:-}" \
    azure_openai_deployment="${azure_openai_deployment:-gpt-4o}" \
    azure_openai_embedding_deployment="${azure_openai_embedding_deployment:-text-embedding-ada-002}" \
    azure_search_endpoint="$azure_search_endpoint" \
    azure_search_key=secretref:azure-search-key \
    next_public_base_url="$next_public_base_url" \
    NODE_ENV=production \
  --output none

echo -e "${GREEN}✅ Environment variables updated${NC}"
echo ""

# Get the app URL
APP_URL=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

echo ""
echo "================================================"
echo -e "${GREEN}✅ Configuration Complete!${NC}"
echo "================================================"
echo ""
echo "📍 App URL: https://${APP_URL}"
echo ""
echo "🔍 Verify configuration:"
echo "   az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query 'properties.template.containers[0].env'"
echo ""
echo "================================================"

