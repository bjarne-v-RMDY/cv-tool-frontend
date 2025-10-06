# Azure Deployment Setup Guide

## Prerequisites
- Azure subscription
- GitHub repository with your code
- Azure CLI installed locally (optional, for testing)

## Step 1: Create Azure Resources

### 1.1 Create Resource Group
```bash
az group create --name cvtool-rg --location "East US"
```

### 1.2 Create Azure Container Registry (ACR)
```bash
az acr create --resource-group cvtool-rg --name cvtoolregistry --sku Basic --admin-enabled true
```

### 1.3 Get ACR Credentials
```bash
az acr credential show --name cvtoolregistry --resource-group cvtool-rg
```
Save the username and password - you'll need these for GitHub secrets.

## Step 2: Create Service Principal for GitHub Actions

### 2.1 Create Service Principal
```bash
az ad sp create-for-rbac --name "cvtool-github-actions" --role contributor --scopes /subscriptions/{subscription-id}/resourceGroups/cvtool-rg --sdk-auth
```

### 2.2 Save the JSON output
This will be your `AZURE_CREDENTIALS` secret.

## Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

1. **AZURE_CREDENTIALS**: The JSON output from step 2.1
2. **ACR_USERNAME**: Username from step 1.3
3. **ACR_PASSWORD**: Password from step 1.3

## Step 4: Update Configuration Files

### 4.1 Update GitHub Actions workflow
Edit `.github/workflows/deploy.yml` and update these variables:
- `AZURE_WEBAPP_NAME`: Your preferred app name
- `AZURE_RESOURCE_GROUP`: Your resource group name
- `CONTAINER_REGISTRY`: Your ACR name
- `location`: Your preferred Azure region

### 4.2 Test the deployment
Push to main branch to trigger the deployment.

## Step 5: Access Your Application

After deployment, your app will be available at:
`https://{dns-name-label}.{region}.azurecontainer.io`

The DNS name is generated as: `{AZURE_WEBAPP_NAME}-{github-run-number}`

## Alternative: Azure Container Apps (Recommended)

For a more modern approach, consider using Azure Container Apps instead of Container Instances:

### Benefits:
- Better scaling capabilities
- Built-in load balancing
- Easier SSL/TLS management
- Better integration with Azure services

### Setup Container Apps:
```bash
# Create Container Apps environment
az containerapp env create --name cvtool-env --resource-group cvtool-rg --location "East US"

# Create Container App
az containerapp create \
  --name cvtool-app \
  --resource-group cvtool-rg \
  --environment cvtool-env \
  --image cvtoolregistry.azurecr.io/cvtool-app:latest \
  --target-port 3000 \
  --ingress external \
  --registry-server cvtoolregistry.azurecr.io \
  --registry-username {ACR_USERNAME} \
  --registry-password {ACR_PASSWORD}
```

## Monitoring and Logs

### View logs:
```bash
az containerapp logs show --name cvtool-app --resource-group cvtool-rg --follow
```

### Monitor metrics:
- Go to Azure Portal → Container Apps → Your App → Monitoring

## Troubleshooting

### Common Issues:
1. **Build failures**: Check Dockerfile and dependencies
2. **Registry login issues**: Verify ACR credentials
3. **Deployment failures**: Check Azure credentials and permissions
4. **App not accessible**: Verify ingress configuration and port settings

### Debug commands:
```bash
# Check resource group
az group show --name cvtool-rg

# List container registries
az acr list --resource-group cvtool-rg

# Check service principal
az ad sp list --display-name "cvtool-github-actions"
```

## Cost Optimization

- Use Basic ACR SKU for development
- Consider Azure Container Apps for better resource management
- Set up auto-scaling rules
- Monitor usage in Azure Cost Management
