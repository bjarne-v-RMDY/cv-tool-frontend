# Alternative: Azure Container Apps Deployment

If you prefer to use Azure Container Apps (recommended), here's an updated workflow:

```yaml
name: Deploy to Azure Container Apps

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  AZURE_WEBAPP_NAME: cvtool-ui
  AZURE_RESOURCE_GROUP: az-rg-rmdy-cv-agent
  CONTAINER_REGISTRY: crRmdyCvAgent
  CONTAINER_APP_ENVIRONMENT: cvtool-env
  CONTAINER_APP_NAME: cvtool-app

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Build application
      run: npm run build

    - name: Login to Azure Container Registry
      uses: azure/docker-login@v1
      with:
        login-server: ${{ env.CONTAINER_REGISTRY }}.azurecr.io
        username: ${{ secrets.ACR_USERNAME }}
        password: ${{ secrets.ACR_PASSWORD }}

    - name: Build and push Docker image
      run: |
        docker build -t ${{ env.CONTAINER_REGISTRY }}.azurecr.io/${{ env.AZURE_WEBAPP_NAME }}:${{ github.sha }} .
        docker push ${{ env.CONTAINER_REGISTRY }}.azurecr.io/${{ env.AZURE_WEBAPP_NAME }}:${{ github.sha }}

    - name: Login to Azure
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Create Container Apps Environment (if not exists)
      if: github.ref == 'refs/heads/main'
      run: |
        az containerapp env create \
          --name ${{ env.CONTAINER_APP_ENVIRONMENT }} \
          --resource-group ${{ env.AZURE_RESOURCE_GROUP }} \
          --location 'France Central' \
          --only-show-errors || echo "Environment already exists"

    - name: Deploy to Azure Container Apps
      if: github.ref == 'refs/heads/main'
      run: |
        az containerapp create \
          --name ${{ env.CONTAINER_APP_NAME }} \
          --resource-group ${{ env.AZURE_RESOURCE_GROUP }} \
          --environment ${{ env.CONTAINER_APP_ENVIRONMENT }} \
          --image ${{ env.CONTAINER_REGISTRY }}.azurecr.io/${{ env.AZURE_WEBAPP_NAME }}:${{ github.sha }} \
          --target-port 3000 \
          --ingress external \
          --registry-server ${{ env.CONTAINER_REGISTRY }}.azurecr.io \
          --registry-username ${{ secrets.ACR_USERNAME }} \
          --registry-password ${{ secrets.ACR_PASSWORD }} \
          --cpu 1.0 \
          --memory 2.0Gi \
          --min-replicas 1 \
          --max-replicas 3 \
          --only-show-errors || \
        az containerapp update \
          --name ${{ env.CONTAINER_APP_NAME }} \
          --resource-group ${{ env.AZURE_RESOURCE_GROUP }} \
          --image ${{ env.CONTAINER_REGISTRY }}.azurecr.io/${{ env.AZURE_WEBAPP_NAME }}:${{ github.sha }} \
          --only-show-errors
```

## Benefits of Container Apps:
- No provider registration required
- Better scaling capabilities
- Built-in load balancing
- Easier SSL/TLS management
- More modern Azure service
- Better integration with other Azure services
