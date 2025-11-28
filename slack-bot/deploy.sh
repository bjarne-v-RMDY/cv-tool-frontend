#!/bin/bash

# Slack Bot Deployment Script for Azure Container Apps
# This script builds and deploys the Slack bot to Azure Container Apps

set -e

# Configuration (matches your existing Azure resources)
RESOURCE_GROUP="az-rg-rmdy-cv-agent"
LOCATION="francecentral"
CONTAINER_REGISTRY="crrmdycvagent"
IMAGE_NAME="cvtool-slackbot"
IMAGE_TAG="latest"
CONTAINER_APP_NAME="cvtool-slackbot"
CONTAINER_APP_ENV="cvtool-env"

echo "🚀 Starting Slack Bot deployment to Azure..."

# Login to Azure (if not already logged in)
echo "🔐 Checking Azure login..."
az account show > /dev/null 2>&1 || az login

# Create resource group if it doesn't exist
echo "📦 Ensuring resource group exists..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output none || true

# Create Azure Container Registry if it doesn't exist
echo "🏗️  Ensuring Azure Container Registry exists..."
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_REGISTRY \
  --sku Basic \
  --admin-enabled true \
  --output none || true

# Build and push Docker image for linux/amd64 (Azure Container Apps requirement)
echo "🏗️  Building Docker image for linux/amd64..."
docker build --platform linux/amd64 -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "🔑 Logging into Azure Container Registry..."
az acr login --name $CONTAINER_REGISTRY

echo "📤 Tagging and pushing image..."
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}
docker push ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}

# Create Container Apps environment if it doesn't exist
echo "🌍 Ensuring Container Apps environment exists..."
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --output none || true

# Get ACR credentials
echo "🔑 Retrieving ACR credentials..."
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY --query "passwords[0].value" -o tsv)

# Deploy or update Container App
echo "🚢 Deploying Container App..."

# Check if app exists
if az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1; then
  echo "♻️  Updating existing Container App..."
  az containerapp update \
    --name $CONTAINER_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --image ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}
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
    --env-vars \
      "NODE_ENV=production" \
      "PORT=3001" \
    --secrets \
      slack-bot-token=secretref:slack-bot-token \
      slack-signing-secret=secretref:slack-signing-secret \
      azure-storage-connection=secretref:azure-storage-connection \
      db-password=secretref:db-password
fi

# Get the app URL
APP_URL=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

echo ""
echo "✅ Deployment complete!"
echo "📍 App URL: https://${APP_URL}"
echo "🔔 Slack Event Subscriptions URL: https://${APP_URL}/slack/events"
echo ""
echo "⚙️  Next steps:"
echo "1. Set environment variables in Azure Portal:"
echo "   - SLACK_BOT_TOKEN"
echo "   - SLACK_SIGNING_SECRET"
echo "   - CV_TOOL_BASE_URL"
echo "   - azure_storage_connection_string"
echo "   - db_server, db_database, db_user, db_password"
echo ""
echo "2. Configure Slack App:"
echo "   - Update Interactivity & Shortcuts Request URL"
echo "   - Update Slash Commands Request URLs"
echo "   - Update Event Subscriptions Request URL"
echo ""
echo "3. Test the deployment:"
echo "   curl https://${APP_URL}/health"

