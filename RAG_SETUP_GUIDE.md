# RAG-Based AI Chat Setup Guide

## Overview
This guide will help you set up the RAG (Retrieval Augmented Generation) system for intelligent CV/candidate search using Azure AI Search and Azure OpenAI.

## Prerequisites
- Azure CLI installed and logged in
- Azure OpenAI resource with GPT-4 deployment
- Azure Storage Account (already configured)
- Azure SQL Database (already configured)

## Step 1: Deploy Azure OpenAI Embedding Model

You need a text embedding model for generating vector embeddings. Deploy the `text-embedding-ada-002` model:

```bash
# Get your Azure OpenAI resource name
OPENAI_RESOURCE="cv-tool-openai"

# Deploy the embedding model
az cognitiveservices account deployment create \
  --resource-group az-rg-rmdy-cv-agent \
  --name $OPENAI_RESOURCE \
  --deployment-name text-embedding-ada-002 \
  --model-name text-embedding-ada-002 \
  --model-version "2" \
  --model-format OpenAI \
  --sku-capacity 120 \
  --sku-name "Standard"
```

## Step 2: Update Environment Variables

### GitHub Secrets
Add these secrets to your GitHub repository:

```
AZURE_SEARCH_ENDPOINT=https://cvtool-search.search.windows.net
AZURE_SEARCH_KEY=8MjXKIWCRU1sRBrBGBVz82CKIowXc8pH5uOy4Mi4fKAzSeCmULY7
```

### Azure Container App
Update your Container App with the new environment variables:

```bash
az containerapp update \
  --name cvtool-app \
  --resource-group az-rg-rmdy-cv-agent \
  --set-env-vars \
    azure_search_endpoint=https://cvtool-search.search.windows.net \
    azure_search_key=8MjXKIWCRU1sRBrBGBVz82CKIowXc8pH5uOy4Mi4fKAzSeCmULY7 \
    azure_openai_embedding_deployment=text-embedding-ada-002
```

### Azure Function App
Update your Function App with the new environment variables:

```bash
az functionapp config appsettings set \
  --name cvtool-functions \
  --resource-group az-rg-rmdy-cv-agent \
  --settings \
    azure_search_endpoint=https://cvtool-search.search.windows.net \
    azure_search_key=8MjXKIWCRU1sRBrBGBVz82CKIowXc8pH5uOy4Mi4fKAzSeCmULY7 \
    azure_openai_embedding_deployment=text-embedding-ada-002
```

## Step 3: Update Database Schema

Run the SQL script to add indexing metadata columns:

```bash
# Connect to your database and run:
sqlcmd -S cvtool-sql-server.database.windows.net -d cvtool-db -U cvtooladmin -P <your-password> -i db/add-indexing-columns.sql
```

Or execute directly:
```sql
ALTER TABLE Users ADD IsIndexed BIT DEFAULT 0;
ALTER TABLE Users ADD LastIndexedAt DATETIME NULL;
ALTER TABLE Users ADD IndexVersion INT DEFAULT 1;
```

## Step 4: Install Dependencies

Install the new dependencies for both projects:

### Root Project (Next.js)
```bash
pnpm install
```

### Azure Functions
```bash
cd azure
npm install
cd ..
```

## Step 5: Create Azure AI Search Index

Run the setup script to create the search index:

```bash
pnpm run setup-search
```

This will create an index called `cv-candidates` with:
- Vector search capabilities (1536-dimensional embeddings)
- Semantic search configuration
- Hybrid search support (keyword + vector)
- Filterable and facetable fields for skills, seniority, experience, etc.

## Step 6: Build and Deploy

### Build Azure Functions
```bash
cd azure
npm run build
cd ..
```

### Deploy Azure Functions
```bash
cd azure
./deploy.sh
cd ..
```

### Deploy Next.js App
Push to GitHub to trigger the deployment workflow, or build and deploy manually.

## Step 7: Index Existing CVs

If you already have CVs in the database, trigger a re-index:

1. Go to `/dashboard/admin` (development mode only)
2. Click "Re-index All" button
3. This will queue all existing users for indexing

Alternatively, upload a new CV and it will be automatically processed and indexed.

## Testing the System

### Test Queries in Chat Panel

Open the chat panel (click the chat icon in the header) and try these queries:

1. **Find by skills:**
   - "Find React developers"
   - "Who knows TypeScript and Next.js?"
   - "Show me developers with Azure experience"

2. **Find by experience:**
   - "Find senior developers"
   - "Show me candidates with 5+ years experience"
   - "Who are mid-level developers?"

3. **Find by location:**
   - "Find developers in Belgium"
   - "Who is located in Europe?"

4. **Specific person queries:**
   - "Tell me about Bjarne's experience"
   - "What projects has John worked on?"
   - "Who worked on AI projects?"

5. **Combined queries:**
   - "Find senior React developers with 5+ years experience"
   - "Who has both TypeScript and Azure OpenAI experience?"
   - "Show me full-stack developers in Belgium"

6. **Project-based queries:**
   - "Which projects used Next.js?"
   - "Who worked with Azure Functions?"
   - "Find developers with AI/ML project experience"

### Expected Behavior

- **Fast response:** Search should return results within 1-2 seconds
- **Relevant results:** Top results should match the query criteria
- **Natural language:** The AI should understand and respond in natural language
- **Citations:** The AI should reference specific candidates when available
- **No hallucination:** Responses should be based only on indexed data

### Verify Indexing

Check if CVs are being indexed:

1. Upload a CV
2. Check Activity Log for:
   - "AI Analysis Completed"
   - "Queued for Indexing"
   - "Indexing Started"
   - "Indexing Completed"

3. Check Azure Portal:
   - Go to Azure AI Search resource
   - Navigate to "Indexes" → "cv-candidates"
   - Check document count (should match number of users)

### Debug Issues

If search isn't working:

1. **Check Azure AI Search:**
   - Verify index exists and has documents
   - Check query statistics in Azure Portal

2. **Check Azure OpenAI:**
   - Verify embedding deployment is active
   - Check API key and endpoint

3. **Check Function Logs:**
   - Go to Azure Function App
   - Check logs for `indexCV` function
   - Look for errors in embedding generation or search indexing

4. **Check Queue:**
   - Go to Azure Storage Account
   - Check `cv-indexing-queue` for messages
   - If messages are stuck, check function is running

## Cost Estimates

### Azure AI Search
- Basic tier: ~€70/month
- Includes: 1 replica, 2GB storage, ~1000 queries/sec

### Azure OpenAI Embeddings
- text-embedding-ada-002: $0.0001 per 1K tokens
- ~500 tokens per CV = $0.00005 per CV
- 100 CVs = $0.005 (negligible)

### Total Monthly Cost
- ~€70-80/month for low usage (<100 CVs, <10K queries/month)

## Maintenance

### Re-indexing
Re-index when:
- Database schema changes
- Index configuration changes
- Data quality issues detected
- After bulk data updates

### Monitoring
Monitor:
- Query latency (should be <2s)
- Search relevance (user feedback)
- Index size and document count
- API costs and token usage

## Troubleshooting

### "No candidates found"
- Verify documents are indexed in Azure AI Search
- Check if users have `IsIndexed = 1` in database
- Try re-indexing from admin panel

### "Error: Failed to generate embedding"
- Check Azure OpenAI embedding deployment
- Verify API key and endpoint
- Check quota limits

### "Search query failed"
- Check Azure AI Search service status
- Verify API key and endpoint
- Check search index exists

### Slow responses
- Check Azure AI Search tier (Basic should be fine for <100 CVs)
- Reduce `top` parameter in search query (currently 10)
- Check network latency to Azure

## Next Steps

1. **Monitor usage:** Track query patterns and adjust index configuration
2. **Fine-tune prompts:** Adjust system prompts in `/app/api/chat/route.ts`
3. **Add filters:** Implement UI filters for skills, seniority, location
4. **Export results:** Add ability to export search results
5. **Analytics:** Track most searched skills and roles

