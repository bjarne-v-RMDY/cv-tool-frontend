# Azure Container Apps Deployment Setup Guide

## Prerequisites
- Azure subscription
- GitHub repository with your code
- Azure CLI installed locally (optional, for testing)

## Step 1: Create Azure Resources

### 1.1 Create Resource Group
```bash
az group create --name az-rg-rmdy-cv-agent --location "France Central"
```

### 1.2 Create Azure Container Registry (ACR)
```bash
az acr create --resource-group az-rg-rmdy-cv-agent --name crRmdyCvAgent --sku Basic --admin-enabled true
```

### 1.3 Get ACR Credentials
```bash
az acr credential show --name crRmdyCvAgent --resource-group az-rg-rmdy-cv-agent
```
Save the username and password - you'll need these for GitHub secrets.

## Step 2: Create Service Principal for GitHub Actions

### 2.1 Create Service Principal
```bash
az ad sp create-for-rbac --name "cvtool-github-actions" --role contributor --scopes /subscriptions/{subscription-id}/resourceGroups/az-rg-rmdy-cv-agent --sdk-auth
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
The workflow is already configured for Container Apps with these settings:
- `AZURE_WEBAPP_NAME`: cvtool-ui
- `AZURE_RESOURCE_GROUP`: az-rg-rmdy-cv-agent
- `CONTAINER_REGISTRY`: crRmdyCvAgent
- `CONTAINER_APP_ENVIRONMENT`: cvtool-env
- `CONTAINER_APP_NAME`: cvtool-app
- `location`: France Central

### 4.2 Test the deployment
Push to main branch to trigger the deployment.

## Step 5: Access Your Application

After deployment, your app will be available at:
`https://{container-app-name}.{random-string}.{region}.azurecontainerapps.io`

The URL format for Container Apps is different from Container Instances. You can find the exact URL in:
- Azure Portal → Container Apps → cvtool-app → Application URL
- Or check the GitHub Actions logs for the deployment URL

## Step 6: Container Apps Benefits

### What Container Apps provides:
- **Cost-optimized**: Minimal resources (0.25 CPU, 0.5GB RAM) for personal use
- **Scale-to-zero**: Scales down to 0 replicas when not in use (saves money!)
- **Single replica**: Maximum 1 replica for personal use
- **Built-in load balancing**: No need to configure load balancers
- **Easy SSL/TLS**: Automatic HTTPS with custom domains
- **Environment management**: Isolated environments for different stages
- **No provider registration**: No need to register Microsoft.ContainerInstance

## Monitoring and Logs

### View logs:
```bash
az containerapp logs show --name cvtool-app --resource-group az-rg-rmdy-cv-agent --follow
```

### Monitor metrics:
- Go to Azure Portal → Container Apps → cvtool-app → Monitoring

## Troubleshooting

### Common Issues:
1. **Build failures**: Check Dockerfile and dependencies
2. **Registry login issues**: Verify ACR credentials
3. **Deployment failures**: Check Azure credentials and permissions
4. **App not accessible**: Verify ingress configuration and port settings

### Debug commands:
```bash
# Check resource group
az group show --name az-rg-rmdy-cv-agent

# List container registries
az acr list --resource-group az-rg-rmdy-cv-agent

# Check service principal
az ad sp list --display-name "cvtool-github-actions"

# List container apps
az containerapp list --resource-group az-rg-rmdy-cv-agent
```

## Cost Optimization

### Current Configuration (Minimal Cost):
- **CPU**: 0.25 cores (minimum for Container Apps)
- **Memory**: 0.5GB (sufficient for Next.js app)
- **Replicas**: 0-1 (scales to zero when not used)
- **ACR**: Basic SKU (cheapest option)

### Cost Breakdown (Estimated):
- **Container Apps Environment**: ~$0.000012 per vCPU-second
- **Container App**: ~$0.000012 per vCPU-second + ~$0.0000015 per GB-second
- **ACR Basic**: ~$5/month (includes 10GB storage)
- **Total**: ~$5-10/month for personal use (mostly ACR cost)

### Additional Cost Savings:
- App scales to 0 replicas when idle (no compute cost)
- Only pay for actual usage time
- Basic ACR SKU is sufficient for personal projects
