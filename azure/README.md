# CV Tool Azure Functions

Azure Functions v4 programming model with TypeScript for CV processing.

## Structure

```
azure/
├── src/
│   └── functions/
│       └── cvProcessing.ts    # Queue trigger function
├── dist/                       # Compiled JavaScript (generated)
├── host.json                   # Function app configuration
├── local.settings.json         # Local environment variables
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript configuration
└── deploy.sh                   # Deployment script
```

## Development

### Local Setup

1. Install dependencies:
```bash
npm install
```

2. Build TypeScript:
```bash
npm run build
```

3. Run locally:
```bash
npm start
```

### Deployment

Deploy using the deployment script:

```bash
./deploy.sh
```

This will:
1. Install dependencies
2. Build TypeScript to `dist/`
3. Create deployment package
4. Deploy to Azure with remote build

## Environment Variables

Configure these in Azure Function App settings:

- `AzureWebJobsStorage` - Azure Storage connection string
- `FUNCTIONS_WORKER_RUNTIME` - Set to `node`
- `azure_sql_server` - SQL Server hostname
- `azure_sql_database` - Database name
- `azure_sql_user` - SQL username
- `azure_sql_password` - SQL password
- `azure_storage_connection_string` - Storage connection string
- `next_public_base_url` - App URL

## Function Details

### cvProcessing

- **Trigger**: Azure Queue Storage (`cv-processing-queue`)
- **Purpose**: Process uploaded CVs and log activity
- **Flow**:
  1. Triggered by queue message
  2. Log "processing started" to ActivityLog
  3. Process CV (placeholder)
  4. Log "processing finished" to ActivityLog
  5. Handle errors with activity logging