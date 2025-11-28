# Deployment Guide - CV Tool Azure Functions (.NET)

This guide covers deploying the .NET Azure Functions to Azure.

## Prerequisites

1. **.NET 8 SDK** installed
2. **Azure Functions Core Tools v4** installed
3. **Azure CLI** installed and logged in
4. Azure subscription with required resources provisioned

## Deployment Options

### Option 1: Deploy via Azure Functions Core Tools (Recommended)

This is the simplest method and works great for CI/CD pipelines.

#### Steps:

1. **Build the project:**
   ```bash
   cd azure-dotnet
   dotnet build --configuration Release
   ```

2. **Deploy to Azure:**
   ```bash
   func azure functionapp publish cv-tool-functions --csharp
   ```
   
   Replace `cv-tool-functions` with your Azure Function App name.

3. **Verify deployment:**
   - Go to Azure Portal → Function App
   - Check that all 5 functions appear in the Functions list
   - Monitor the logs for any startup errors

### Option 2: Deploy via Azure Portal

1. **Publish the project locally:**
   ```bash
   dotnet publish --configuration Release --output ./publish
   ```

2. **Create a ZIP file:**
   ```bash
   cd publish
   zip -r ../deploy.zip *
   cd ..
   ```

3. **Upload via Azure Portal:**
   - Go to your Function App in Azure Portal
   - Click "Deployment Center"
   - Choose "ZIP Deploy"
   - Upload `deploy.zip`

### Option 3: Deploy via VS Code

1. Install the **Azure Functions extension** for VS Code
2. Open the `azure-dotnet` folder in VS Code
3. Click the Azure icon in the sidebar
4. Click "Deploy to Function App..."
5. Select your subscription and Function App
6. Confirm the deployment

### Option 4: Deploy via Azure DevOps / GitHub Actions

#### GitHub Actions Example:

```yaml
name: Deploy Azure Functions

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0.x'
      
      - name: Build
        run: |
          cd azure-dotnet
          dotnet build --configuration Release
          dotnet publish --configuration Release --output ./output
      
      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: cv-tool-functions
          package: azure-dotnet/output
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

## Creating the Azure Function App

If you haven't created the Function App yet:

```bash
# Variables
RESOURCE_GROUP="cv-tool-rg"
LOCATION="francecentral"
STORAGE_ACCOUNT="cvtoolstorage"
FUNCTION_APP_NAME="cv-tool-functions"

# Create Function App
az functionapp create \
  --resource-group $RESOURCE_GROUP \
  --consumption-plan-location $LOCATION \
  --runtime dotnet-isolated \
  --runtime-version 8 \
  --functions-version 4 \
  --name $FUNCTION_APP_NAME \
  --storage-account $STORAGE_ACCOUNT \
  --os-type Linux
```

## Configuration

After deployment, you need to configure the Application Settings:

### Method 1: Via Azure Portal

1. Go to your Function App in Azure Portal
2. Click "Configuration" under Settings
3. Add the following Application Settings:

```
AzureWebJobsStorage = <your-storage-connection-string>
FUNCTIONS_WORKER_RUNTIME = dotnet-isolated
azure_sql_server = cvtool-sql-server.database.windows.net
azure_sql_database = cvtool-db
azure_sql_user = cvtooladmin
azure_sql_password = <your-sql-password>
azure_storage_connection_string = <your-storage-connection-string>
next_public_base_url = https://your-app.azurecontainerapps.io
azure_openai_key = <your-openai-key>
azure_openai_resource = https://your-openai.openai.azure.com/...
azure_openai_deployment = gpt-4o
azure_search_endpoint = https://your-search.search.windows.net
azure_search_key = <your-search-key>
azure_openai_embedding_deployment = text-embedding-ada-002
```

4. Click "Save"
5. Restart the Function App

### Method 2: Via Azure CLI

```bash
FUNCTION_APP_NAME="cv-tool-functions"

az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group cv-tool-rg \
  --settings \
    "azure_sql_server=cvtool-sql-server.database.windows.net" \
    "azure_sql_database=cvtool-db" \
    "azure_sql_user=cvtooladmin" \
    "azure_sql_password=YOUR_PASSWORD" \
    "azure_storage_connection_string=YOUR_STORAGE_CONNECTION" \
    "azure_openai_key=YOUR_OPENAI_KEY" \
    "azure_openai_resource=YOUR_OPENAI_ENDPOINT" \
    "azure_openai_deployment=gpt-4o" \
    "azure_search_endpoint=YOUR_SEARCH_ENDPOINT" \
    "azure_search_key=YOUR_SEARCH_KEY" \
    "azure_openai_embedding_deployment=text-embedding-ada-002" \
    "next_public_base_url=YOUR_APP_URL"
```

## Network Configuration

### SQL Database Firewall

Ensure your Function App can access the SQL Database:

```bash
# Allow Azure services
az sql server firewall-rule create \
  --resource-group cv-tool-rg \
  --server cvtool-sql-server \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Storage Account

Ensure the storage account allows access from Azure services.

## Testing Deployment

### 1. Check Function App is Running

```bash
az functionapp show \
  --name cv-tool-functions \
  --resource-group cv-tool-rg \
  --query "state"
```

Should return `"Running"`

### 2. List Functions

```bash
az functionapp function list \
  --name cv-tool-functions \
  --resource-group cv-tool-rg
```

Should show: CVProcessing, IndexCV, ProjectProcessing, VacancyProcessing, VacancyMatching

### 3. Test Queue Trigger

Send a test message to a queue:

```bash
# Using Azure CLI
az storage message put \
  --queue-name cv-processing-queue \
  --content '{"uniqueFileName":"test.txt","fileName":"test.txt","fileType":"text/plain"}' \
  --connection-string "YOUR_STORAGE_CONNECTION_STRING"
```

Check Application Insights or Logs to verify the function was triggered.

### 4. Monitor Logs

In Azure Portal:
1. Go to Function App
2. Click "Log stream" in the left menu
3. Upload a CV via the frontend
4. Watch logs for processing activity

## Monitoring and Troubleshooting

### Application Insights

Application Insights is automatically configured. View telemetry:

```bash
# Get Application Insights resource
az functionapp show \
  --name cv-tool-functions \
  --resource-group cv-tool-rg \
  --query "appInsightsInstrumentationKey"
```

Go to Application Insights in Azure Portal to view:
- Live Metrics
- Failures
- Performance
- Dependencies

### Common Issues

#### Functions not appearing after deployment:
- Ensure you're using .NET 8 and Functions v4
- Check that `FUNCTIONS_WORKER_RUNTIME` is set to `dotnet-isolated`
- Verify the deployment package includes all necessary DLLs

#### Queue not triggering:
- Verify `AzureWebJobsStorage` is configured correctly
- Check queue names match exactly (case-sensitive)
- Ensure storage account is accessible

#### OpenAI errors:
- Verify API key and endpoint are correct
- Check deployment names match your Azure OpenAI resource
- Ensure you have sufficient quota

#### SQL connection errors:
- Verify firewall rules allow Azure services
- Check connection string format
- Ensure SQL user has proper permissions

## Scaling Configuration

### Consumption Plan (Default)
- Automatic scaling based on queue length
- No configuration needed
- Cost-effective for variable workloads

### Premium Plan (For High Volume)
```bash
az functionapp plan create \
  --resource-group cv-tool-rg \
  --name cv-tool-premium-plan \
  --location francecentral \
  --sku EP1 \
  --is-linux true

az functionapp update \
  --name cv-tool-functions \
  --resource-group cv-tool-rg \
  --plan cv-tool-premium-plan
```

## Continuous Deployment

### Enable Deployment Slot
```bash
az functionapp deployment slot create \
  --name cv-tool-functions \
  --resource-group cv-tool-rg \
  --slot staging

# Deploy to staging slot first
func azure functionapp publish cv-tool-functions --slot staging

# Swap to production after testing
az functionapp deployment slot swap \
  --resource-group cv-tool-rg \
  --name cv-tool-functions \
  --slot staging
```

## Rollback

If deployment fails:

```bash
# Via Azure CLI - redeploy previous version
func azure functionapp publish cv-tool-functions --csharp

# Via Portal - use Deployment History
# Go to Function App → Deployment Center → Logs → Redeploy
```

## Cost Optimization

1. **Use Consumption Plan** for variable workloads
2. **Configure max scale-out** to limit costs:
   ```bash
   az functionapp config set \
     --name cv-tool-functions \
     --resource-group cv-tool-rg \
     --ftps-state Disabled \
     --number-of-workers 10
   ```

3. **Set up budget alerts** in Azure Cost Management

## Security Best Practices

1. **Use Managed Identity** instead of connection strings where possible
2. **Store secrets in Azure Key Vault**
3. **Enable HTTPS only**
4. **Restrict CORS** to your frontend domain
5. **Enable Application Insights** for monitoring
6. **Regular security updates** - rebuild and redeploy monthly

## Backup and Disaster Recovery

1. **Database backups** - Automated in Azure SQL
2. **Configuration backup** - Export ARM template:
   ```bash
   az functionapp show \
     --name cv-tool-functions \
     --resource-group cv-tool-rg > backup-config.json
   ```

3. **Code backup** - Ensure code is in source control

## Next Steps

After successful deployment:

1. ✅ Test all 5 functions with real data
2. ✅ Set up monitoring alerts in Application Insights
3. ✅ Configure log retention policies
4. ✅ Set up automated deployment pipeline
5. ✅ Document any custom configurations

## Support

For deployment issues:
- Check Application Insights logs
- Review Function App deployment logs
- Check Azure Resource Health
- Contact Azure Support if needed


