# Update Container App Environment Variables

This script updates your Azure Container App environment variables and secrets from a local `.env` file.

## Quick Start

1. **Create `.env` file** (copy from template):
   ```bash
   cp env.template .env
   ```

2. **Edit `.env`** with your actual values:
   - Replace `YOUR_PASSWORD` with your SQL password
   - Replace `YOUR_KEY` with your storage account key
   - Replace `YOUR_OPENAI_KEY` with your OpenAI key
   - Replace `YOUR_SEARCH_KEY` with your search key
   - Update URLs if needed

3. **Run the script**:
   ```bash
   ./scripts/update-container-app-env.sh
   ```

## What It Does

✅ Reads all variables from `.env` file  
✅ Validates required variables are present  
✅ Updates Azure Container App secrets securely  
✅ Updates environment variables  
✅ References secrets using `secretref:` (secure)  

## Required Variables

| Variable | Description |
|----------|-------------|
| `azure_sql_server` | SQL Server hostname |
| `azure_sql_database` | Database name |
| `azure_sql_user` | Database username |
| `azure_sql_password` | Database password (stored as secret) |
| `azure_storage_connection_string` | Storage connection string (stored as secret) |
| `azure_openai_key` | OpenAI API key (stored as secret) |
| `azure_openai_resource` | OpenAI endpoint URL |
| `azure_openai_deployment` | OpenAI deployment name (default: gpt-4o) |
| `azure_openai_embedding_deployment` | Embedding deployment (default: text-embedding-ada-002) |
| `azure_search_endpoint` | AI Search endpoint |
| `azure_search_key` | Search API key (stored as secret) |
| `next_public_base_url` | Your app's public URL |

## Security

- ✅ Secrets are stored as Azure Container App secrets (not plain env vars)
- ✅ `.env` file is in `.gitignore` (never committed)
- ✅ Script validates all required variables before deployment

## Troubleshooting

**"Missing required variable"**
→ Check your `.env` file has all variables listed above

**"Container App not found"**
→ Verify the app name and resource group in the script match your Azure setup

**"Azure login failed"**
→ Run `az login` manually first

## Verify Configuration

After running the script, verify it worked:

```bash
az containerapp show \
  --name cvtool-app \
  --resource-group az-rg-rmdy-cv-agent \
  --query 'properties.template.containers[0].env'
```

You should see all your environment variables listed (secrets will show as `secretref:` references).

