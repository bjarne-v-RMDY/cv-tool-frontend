import { app, InvocationContext } from '@azure/functions';
import * as sql from 'mssql';
import { BlobServiceClient } from '@azure/storage-blob';
import { QueueServiceClient } from '@azure/storage-queue';
import { createAzure } from '@ai-sdk/azure';
import { generateText } from 'ai';

const azure_openai_key = process.env.azure_openai_key || '';
const azure_openai_resource = process.env.azure_openai_resource || '';
const azure_openai_deployment = process.env.azure_openai_deployment || '';

// Database connection configuration
const dbConfig: sql.config = {
    server: process.env.azure_sql_server || '',
    database: process.env.azure_sql_database || '',
    user: process.env.azure_sql_user || '',
    password: process.env.azure_sql_password || '',
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

// Function to add activity log entry
async function addActivityLog(type: string, title: string, description: string, status: string = 'processing', metadata: any = {}): Promise<void> {
    try {
        const pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('type', sql.VarChar(50), type)
            .input('title', sql.NVarChar(200), title)
            .input('description', sql.NVarChar(500), description)
            .input('status', sql.VarChar(20), status)
            .input('metadata', sql.NVarChar(4000), JSON.stringify(metadata))
            .query(`
                INSERT INTO ActivityLog (Type, Title, Description, Status, Metadata)
                VALUES (@type, @title, @description, @status, @metadata)
            `);
        
        await pool.close();
        console.log(`Activity log added: ${type} - ${title}`);
    } catch (error) {
        console.error('Error adding activity log:', error);
    }
}

// Helper function to convert stream to buffer
async function streamToBuffer(readableStream: NodeJS.ReadableStream | null): Promise<Buffer> {
    if (!readableStream) {
        return Buffer.from([]);
    }
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        readableStream.on('data', (data: Buffer) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on('error', reject);
    });
}

// Queue trigger function for project processing
app.storageQueue('projectProcessing', {
    queueName: 'project-processing-queue',
    connection: 'AzureWebJobsStorage',
    handler: async (queueItem: unknown, context: InvocationContext): Promise<void> => {
        context.log('Project Processing function triggered');
        context.log('Queue item:', queueItem);

        try {
            // Log processing started
            await addActivityLog(
                'processing', 
                'Project Processing Started', 
                'Processing project file from queue', 
                'processing',
                {
                    queueItem: queueItem,
                    timestamp: new Date().toISOString()
                }
            );

            // Download file from Azure Blob Storage and extract text
            const storageConnection = process.env.azure_storage_connection_string || '';
            const containerName = 'project-files';

            const item = typeof queueItem === 'string' ? JSON.parse(queueItem) : (queueItem as any);
            const blobName: string = item?.uniqueFileName || '';
            const fileType: string = item?.fileType || '';
            const userId: number = item?.userId;
            const fileName: string = item?.fileName || '';

            if (!storageConnection || !blobName) {
                throw new Error('Missing storage connection or blob name from queue item');
            }

            if (!userId) {
                throw new Error('Missing userId from queue item');
            }

            context.log(`Processing project file: ${fileName} for user ID: ${userId}`);

            const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnection);
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blobClient = containerClient.getBlobClient(blobName);
            const download = await blobClient.download();
            const buffer = await streamToBuffer(download.readableStreamBody || null);

            // Extract text based on mime type
            let projectText = '';
            if (fileType === 'application/pdf') {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const pdfParse = require('pdf-parse');
                const parsed = await pdfParse(buffer);
                projectText = parsed?.text || '';
            } else {
                projectText = buffer.toString('utf-8');
            }

            // Truncate to keep prompt reasonable
            const MAX_CHARS = 20000;
            if (projectText.length > MAX_CHARS) {
                projectText = projectText.slice(0, MAX_CHARS);
            }

            context.log(`Extracted text length: ${projectText.length} chars`);

            let analysisResult: any = null;

            // Run AI analysis if credentials are configured
            if (azure_openai_key && azure_openai_resource) {
                // Parse the Azure OpenAI endpoint
                let resourceName = '';
                let deployment = azure_openai_deployment || 'gpt-4o';

                // Check if azure_openai_resource is a full URL or just a resource name
                if (azure_openai_resource.startsWith('http')) {
                    // Extract resource name from full URL
                    const match = azure_openai_resource.match(/https?:\/\/([^.]+)\.openai\.azure\.com/);
                    if (match) {
                        resourceName = match[1];
                    } else {
                        throw new Error('Invalid Azure OpenAI resource URL format');
                    }
                    
                    // Try to extract deployment from URL path if not provided
                    if (!azure_openai_deployment) {
                        const deploymentMatch = azure_openai_resource.match(/\/deployments\/([^/]+)/);
                        if (deploymentMatch) {
                            deployment = deploymentMatch[1];
                        }
                    }
                } else {
                    // Treat as resource name directly
                    resourceName = azure_openai_resource;
                }

                const azure = createAzure({
                    apiKey: azure_openai_key,
                    resourceName: resourceName,
                });

                const prompt = `You are an assistant that extracts structured project information from documents. Read the following project document and return STRICT JSON with these fields:

{
    "projects": [
        {
            "title": string,
            "company": string,
            "role": string,
            "description": string,
            "startDate": "YYYY-MM-DD" or null,
            "endDate": "YYYY-MM-DD" or null,
            "isCurrentJob": boolean,
            "technologies": [
                {
                    "name": string,
                    "category": "Frontend" | "Backend" | "Mobile" | "Design" | "AR/VR" | "Database" | "DevOps" | "Other"
                }
            ]
        }
    ]
}

Important rules:
- Extract ALL projects mentioned in the document
- If dates are vague (e.g., "2023"), use first day of year/month as default
- Set isCurrentJob to true if project is ongoing or mentions "present", "current", etc.
- Categorize each technology appropriately
- Include all mentioned technologies, frameworks, tools, and platforms
- If information is missing, use null for strings and empty arrays for lists
- Return ONLY valid JSON, no markdown formatting

Project Document:
${projectText}`;

                try {
                    context.log('Sending request to Azure OpenAI...');
                    
                    const response = await generateText({
                        model: azure(deployment),
                        prompt,
                        temperature: 0.1,
                    });

                    context.log('Received response from Azure OpenAI');
                    context.log('Response text:', response.text);

                    // Clean up the response text (remove markdown code blocks if present)
                    let jsonText = response.text.trim();
                    if (jsonText.startsWith('```json')) {
                        jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
                    } else if (jsonText.startsWith('```')) {
                        jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
                    }

                    analysisResult = JSON.parse(jsonText);
                    context.log('Parsed analysis result:', JSON.stringify(analysisResult, null, 2));

                } catch (error) {
                    context.error('OpenAI API error:', error);
                    await addActivityLog(
                        'error',
                        'AI Analysis Failed',
                        `Failed to analyze project file: ${fileName}`,
                        'failed',
                        {
                            error: error instanceof Error ? error.message : 'Unknown error',
                            userId,
                            fileName
                        }
                    );
                    throw error;
                }
            } else {
                throw new Error('Azure OpenAI credentials not configured');
            }

            // Store projects in database
            const pool = await sql.connect(dbConfig);

            // Verify user exists
            const userCheck = await pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT Id, Name FROM Users WHERE Id = @userId');

            if (userCheck.recordset.length === 0) {
                throw new Error(`User with ID ${userId} not found`);
            }

            const userName = userCheck.recordset[0].Name;
            context.log(`Adding projects for user: ${userName} (ID: ${userId})`);

            let projectsAdded = 0;
            let technologiesAdded = 0;

            if (analysisResult?.projects && Array.isArray(analysisResult.projects)) {
                for (const project of analysisResult.projects) {
                    try {
                        // Insert project
                        const projectResult = await pool.request()
                            .input('userId', sql.Int, userId)
                            .input('title', sql.NVarChar(200), project.title || 'Untitled Project')
                            .input('company', sql.NVarChar(100), project.company || 'Unknown')
                            .input('role', sql.NVarChar(100), project.role)
                            .input('description', sql.NVarChar(sql.MAX), project.description)
                            .input('startDate', sql.Date, project.startDate)
                            .input('endDate', sql.Date, project.endDate)
                            .input('isCurrentJob', sql.Bit, project.isCurrentJob || false)
                            .query(`
                                INSERT INTO Projects (UserId, Title, Company, Role, Description, StartDate, EndDate, IsCurrentJob)
                                OUTPUT INSERTED.Id
                                VALUES (@userId, @title, @company, @role, @description, @startDate, @endDate, @isCurrentJob)
                            `);

                        const projectId = projectResult.recordset[0].Id;
                        projectsAdded++;

                        context.log(`Inserted project: ${project.title} (ID: ${projectId})`);

                        // Insert technologies
                        if (project.technologies && Array.isArray(project.technologies)) {
                            for (const tech of project.technologies) {
                                try {
                                    await pool.request()
                                        .input('projectId', sql.Int, projectId)
                                        .input('technology', sql.NVarChar(100), tech.name)
                                        .input('category', sql.NVarChar(50), tech.category || 'Other')
                                        .query(`
                                            INSERT INTO Technologies (ProjectId, Technology, Category)
                                            VALUES (@projectId, @technology, @category)
                                        `);
                                    
                                    technologiesAdded++;
                                } catch (techError) {
                                    context.error(`Error adding technology ${tech.name}:`, techError);
                                }
                            }
                        }
                    } catch (projectError) {
                        context.error(`Error adding project ${project.title}:`, projectError);
                    }
                }
            }

            await pool.close();

            // Queue for AI Search reindexing
            if (projectsAdded > 0) {
                try {
                    const storageConnectionString = process.env.azure_storage_connection_string || process.env.AzureWebJobsStorage;
                    if (!storageConnectionString) {
                        throw new Error('Azure Storage Connection String not found in environment variables.');
                    }
                    const queueServiceClient = QueueServiceClient.fromConnectionString(storageConnectionString);

                    const indexingQueueClient = queueServiceClient.getQueueClient('cv-indexing-queue');
                    await indexingQueueClient.createIfNotExists();
                    await indexingQueueClient.sendMessage(Buffer.from(JSON.stringify({ userId })).toString('base64'));
                    context.log(`📊 Queued user ${userId} for AI Search reindexing`);

                    await addActivityLog(
                        'indexing',
                        'Queued for Reindexing',
                        `Candidate data queued for AI search reindexing after adding ${projectsAdded} project(s)`,
                        'in_progress',
                        { userId, userName, projectsAdded }
                    );
                } catch (queueError) {
                    context.error('Failed to queue for reindexing:', queueError);
                    // Don't fail the whole process if indexing queue fails
                }
            }

            // Log success
            await addActivityLog(
                'processing',
                'Project Processing Completed',
                `Successfully processed ${fileName} for ${userName}. Added ${projectsAdded} project(s) and ${technologiesAdded} technologies.`,
                'completed',
                {
                    userId,
                    userName,
                    fileName,
                    projectsAdded,
                    technologiesAdded
                }
            );

            context.log(`Processing completed: ${projectsAdded} projects added, ${technologiesAdded} technologies added`);

        } catch (error) {
            context.error('Error processing project file:', error);
            
            await addActivityLog(
                'error',
                'Project Processing Failed',
                `Failed to process project file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'failed',
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined
                }
            );

            throw error;
        }
    }
});

