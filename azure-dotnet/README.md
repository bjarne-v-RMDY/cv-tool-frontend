# CV Tool Azure Functions (.NET 8)

This is the .NET 8 implementation of the Azure Functions for the CV Tool application. It replaces the TypeScript implementation with a more robust and easier-to-deploy solution.

## Features

This Azure Functions project includes 5 queue-triggered functions:

1. **CVProcessing** - Processes uploaded CV files using AI to extract candidate information
2. **IndexCV** - Indexes candidate data into Azure AI Search with vector embeddings
3. **ProjectProcessing** - Processes project documents and adds them to candidate profiles
4. **VacancyProcessing** - Processes vacancy/job descriptions and extracts requirements
5. **VacancyMatching** - Matches candidates to vacancies using semantic search and LLM evaluation

## Technology Stack

- **.NET 8** with C#
- **Azure Functions v4** (Isolated Worker)
- **Azure OpenAI** for AI-powered analysis and embeddings
- **Azure AI Search** for semantic candidate search
- **Azure SQL Database** for data storage
- **Azure Blob Storage** for file storage
- **Azure Queue Storage** for message queuing
- **PdfPig** for PDF text extraction

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Azure Functions Core Tools v4](https://docs.microsoft.com/azure/azure-functions/functions-run-local)
- Azure subscription with the following resources:
  - Azure Storage Account
  - Azure SQL Database
  - Azure OpenAI Service
  - Azure AI Search Service

## Local Development Setup

1. **Restore NuGet packages:**
   ```bash
   dotnet restore
   ```

2. **Update `local.settings.json`** with your Azure credentials (already configured in this project).

3. **Run the functions locally:**
   ```bash
   func start
   ```

## Configuration

All configuration is done via environment variables in `local.settings.json` (for local dev) or Application Settings (for Azure deployment):

| Setting | Description |
|---------|-------------|
| `AzureWebJobsStorage` | Azure Storage connection string for Functions runtime |
| `azure_sql_server` | Azure SQL Server hostname |
| `azure_sql_database` | Azure SQL Database name |
| `azure_sql_user` | Azure SQL username |
| `azure_sql_password` | Azure SQL password |
| `azure_storage_connection_string` | Storage connection for blobs and queues |
| `azure_openai_key` | Azure OpenAI API key |
| `azure_openai_resource` | Azure OpenAI endpoint URL |
| `azure_openai_deployment` | Chat completion deployment name |
| `azure_openai_embedding_deployment` | Embedding deployment name |
| `azure_search_endpoint` | Azure AI Search endpoint |
| `azure_search_key` | Azure AI Search API key |
| `next_public_base_url` | Base URL of the frontend application |

## Project Structure

```
azure-dotnet/
├── Functions/              # Azure Function implementations
│   ├── CVProcessingFunction.cs
│   ├── IndexCVFunction.cs
│   ├── ProjectProcessingFunction.cs
│   ├── VacancyProcessingFunction.cs
│   └── VacancyMatchingFunction.cs
├── Services/               # Business logic services
│   ├── DatabaseService.cs
│   ├── OpenAIService.cs
│   ├── BlobService.cs
│   ├── QueueService.cs
│   ├── SearchService.cs
│   └── ActivityLogService.cs
├── Models/                 # Data models and DTOs
│   ├── CVAnalysisResult.cs
│   ├── ProjectAnalysisResult.cs
│   ├── VacancyAnalysisResult.cs
│   └── QueueMessages.cs
├── Utils/                  # Utility classes
│   ├── TextExtractor.cs
│   └── EmailGenerator.cs
├── Program.cs              # Function app startup
├── host.json              # Function host configuration
└── local.settings.json    # Local environment variables
```

## Building and Publishing

### Build the project:
```bash
dotnet build --configuration Release
```

### Publish to Azure:
```bash
# Method 1: Using Azure Functions Core Tools
func azure functionapp publish <your-function-app-name>

# Method 2: Using dotnet publish + Azure CLI
dotnet publish --configuration Release --output ./publish
cd publish
func azure functionapp publish <your-function-app-name> --csharp
```

### Deploy from VS Code:
1. Install the "Azure Functions" extension
2. Right-click on the project folder
3. Select "Deploy to Function App..."
4. Choose your Azure subscription and Function App

## Queue Triggers

The functions are triggered by messages in the following Azure Storage Queues:

- `cv-processing-queue` → CVProcessing
- `cv-indexing-queue` → IndexCV
- `project-processing-queue` → ProjectProcessing
- `vacancy-processing-queue` → VacancyProcessing
- `vacancy-matching-queue` → VacancyMatching

## Function Workflow

### CV Upload Flow:
1. User uploads CV → Frontend sends to `cv-processing-queue`
2. **CVProcessing** downloads blob, extracts text, analyzes with OpenAI, stores in DB
3. **CVProcessing** sends userId to `cv-indexing-queue`
4. **IndexCV** creates vector embeddings and indexes in Azure AI Search

### Project Upload Flow:
1. User uploads project doc → Frontend sends to `project-processing-queue`
2. **ProjectProcessing** extracts project info with OpenAI, stores in DB
3. **ProjectProcessing** sends userId to `cv-indexing-queue` for reindexing

### Vacancy Upload Flow:
1. User uploads vacancy doc → Frontend sends to `vacancy-processing-queue`
2. **VacancyProcessing** extracts requirements with OpenAI, stores in DB
3. **VacancyProcessing** sends vacancyId to `vacancy-matching-queue`
4. **VacancyMatching** searches candidates, evaluates with LLM, stores matches

## Error Handling

- All functions include comprehensive try-catch blocks
- Errors are logged to Azure Application Insights
- Activity logs are written to the database for tracking
- Failed messages will be retried automatically (max 5 times by default)

## Performance Considerations

- Functions use Azure Functions' built-in scaling
- Database connections are properly managed and disposed
- Parallel evaluation of candidates in VacancyMatching
- Text truncation to 20,000 characters for AI analysis
- Vector search limited to top 20 results

## Monitoring

Monitor your functions through:
- **Azure Portal** → Function App → Monitor
- **Application Insights** for detailed telemetry
- **Storage Explorer** to view queue messages
- **Activity Log** table in SQL Database

## Differences from TypeScript Version

### Improvements:
- ✅ **Better performance** - Compiled, strongly-typed code
- ✅ **Easier deployment** - Single binary, no node_modules
- ✅ **Better IDE support** - Full IntelliSense and debugging
- ✅ **Type safety** - Compile-time type checking
- ✅ **Better error handling** - Structured exception handling
- ✅ **Dependency injection** - Clean service architecture
- ✅ **More reliable** - Less runtime errors

### Breaking Changes:
- None - fully compatible with existing queue messages and database schema

## Troubleshooting

### Function not triggering:
- Check that the queue exists in Storage Account
- Verify `AzureWebJobsStorage` connection string is correct
- Check Application Insights logs for errors

### OpenAI errors:
- Verify API key is valid
- Check deployment names match your Azure OpenAI deployments
- Ensure you have quota available

### Database errors:
- Verify SQL connection string is correct
- Check firewall rules allow Azure services
- Ensure database schema is up to date

### PDF parsing errors:
- Some PDFs may be scanned images (OCR not implemented)
- Try with text-based PDFs

## Support

For issues, please check:
1. Application Insights logs
2. Function App logs in Azure Portal
3. ActivityLog table in the database

## License

Proprietary - RMDY

