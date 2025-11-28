#!/bin/bash

# Slack Bot Deployment Script with Secret Configuration
# This script builds, deploys, and configures the Slack bot with all necessary secrets

set -e

# Configuration (matches your existing Azure resources)
RESOURCE_GROUP="az-rg-rmdy-cv-agent"
LOCATION="francecentral"
CONTAINER_REGISTRY="crrmdycvagent"
IMAGE_NAME="cvtool-slackbot"
IMAGE_TAG="latest"
CONTAINER_APP_NAME="cvtool-slackbot"
CONTAINER_APP_ENV="cvtool-env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Starting Slack Bot deployment to Azure..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env file not found!${NC}"
  echo "Please create .env file with your configuration."
  echo "You can copy .env.example and fill in your values."
  exit 1
fi

# Load environment variables from .env
echo "📁 Loading configuration from .env file..."
export $(cat .env | grep -v '^#' | xargs)

# Validate required variables
REQUIRED_VARS=(
  "SLACK_BOT_TOKEN"
  "SLACK_SIGNING_SECRET"
  "CV_TOOL_BASE_URL"
  "azure_storage_connection_string"
  "db_server"
  "db_database"
  "db_user"
  "db_password"
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

# Create resource group if it doesn't exist
echo "📦 Ensuring resource group exists..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output none 2>/dev/null || true
echo -e "${GREEN}✅ Resource group ready${NC}"
echo ""

# Create Azure Container Registry if it doesn't exist
echo "🏗️  Ensuring Azure Container Registry exists..."
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_REGISTRY \
  --sku Basic \
  --admin-enabled true \
  --output none 2>/dev/null || true
echo -e "${GREEN}✅ Container Registry ready${NC}"
echo ""

# Build Docker image for linux/amd64 (Azure Container Apps requirement)
echo "🏗️  Building Docker image for linux/amd64..."
docker build --platform linux/amd64 -t ${IMAGE_NAME}:${IMAGE_TAG} .
echo -e "${GREEN}✅ Docker image built${NC}"
echo ""

# Login to ACR and push image
echo "🔑 Logging into Azure Container Registry..."
az acr login --name $CONTAINER_REGISTRY

echo "📤 Pushing image to registry..."
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}
docker push ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}
echo -e "${GREEN}✅ Image pushed to registry${NC}"
echo ""

# Create Container Apps environment if it doesn't exist
echo "🌍 Ensuring Container Apps environment exists..."
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --output none 2>/dev/null || true
echo -e "${GREEN}✅ Container Apps environment ready${NC}"
echo ""

# Get ACR credentials
echo "🔑 Retrieving ACR credentials..."
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY --query "passwords[0].value" -o tsv)

# Deploy or update Container App
echo "🚢 Deploying Container App..."

if az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1; then
  echo "♻️  Updating existing Container App..."
  
  # Update the image
  az containerapp update \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --image ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG} \
    --output none
  
  # Update secrets
  az containerapp secret set \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --secrets \
      slack-bot-token="$SLACK_BOT_TOKEN" \
      slack-signing-secret="$SLACK_SIGNING_SECRET" \
      azure-storage-connection="$azure_storage_connection_string" \
      db-password="$db_password" \
    --output none
  
  # Update environment variables
  az containerapp update \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --set-env-vars \
      NODE_ENV=production \
      PORT=3001 \
      CV_TOOL_BASE_URL="$CV_TOOL_BASE_URL" \
      db_server="$db_server" \
      db_database="$db_database" \
      db_user="$db_user" \
      SLACK_BOT_TOKEN=secretref:slack-bot-token \
      SLACK_SIGNING_SECRET=secretref:slack-signing-secret \
      azure_storage_connection_string=secretref:azure-storage-connection \
      db_password=secretref:db-password \
    --output none
    
  echo -e "${GREEN}✅ Container App updated${NC}"
else
  echo "🆕 Creating new Container App..."
  
  az containerapp create \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $CONTAINER_APP_ENV \
    --image ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG} \
    --registry-server ${CONTAINER_REGISTRY}.azurecr.io \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --target-port 3001 \
    --ingress external \
    --min-replicas 1 \
    --max-replicas 3 \
    --cpu 0.5 \
    --memory 1.0Gi \
    --secrets \
      slack-bot-token="$SLACK_BOT_TOKEN" \
      slack-signing-secret="$SLACK_SIGNING_SECRET" \
      azure-storage-connection="$azure_storage_connection_string" \
      db-password="$db_password" \
    --env-vars \
      NODE_ENV=production \
      PORT=3001 \
      CV_TOOL_BASE_URL="$CV_TOOL_BASE_URL" \
      db_server="$db_server" \
      db_database="$db_database" \
      db_user="$db_user" \
      SLACK_BOT_TOKEN=secretref:slack-bot-token \
      SLACK_SIGNING_SECRET=secretref:slack-signing-secret \
      azure_storage_connection_string=secretref:azure-storage-connection \
      db_password=secretref:db-password \
    --output none
    
  echo -e "${GREEN}✅ Container App created${NC}"
fi

echo ""

# Get the app URL
APP_URL=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

echo ""
echo "================================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "📍 App URL: https://${APP_URL}"
echo "🔔 Health Check: https://${APP_URL}/health"
echo "🔗 Slack Events URL: https://${APP_URL}/slack/events"
echo ""
echo "⚙️  Next Steps:"
echo ""
echo "1. Test the health endpoint:"
echo "   curl https://${APP_URL}/health"
echo ""
echo "2. Configure Slack App (https://api.slack.com/apps):"
echo "   - Interactivity & Shortcuts → Request URL:"
echo "     https://${APP_URL}/slack/events"
echo ""
echo "   - Slash Commands → Update all command URLs to:"
echo "     https://${APP_URL}/slack/events"
echo ""
echo "   - Event Subscriptions → Request URL:"
echo "     https://${APP_URL}/slack/events"
echo ""
echo "3. Test in Slack:"
echo "   /upload-cv"
echo ""
echo "================================================"

