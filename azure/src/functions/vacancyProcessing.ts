import { app, InvocationContext } from '@azure/functions';
import * as sql from 'mssql';
import { BlobServiceClient } from '@azure/storage-blob';
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

// Queue trigger function for vacancy processing
app.storageQueue('vacancyProcessing', {
    queueName: 'vacancy-processing-queue',
    connection: 'AzureWebJobsStorage',
    handler: async (queueItem: unknown, context: InvocationContext): Promise<void> => {
        context.log('Vacancy Processing function triggered');
        context.log('Queue item:', queueItem);

        try {
            // Log processing started
            await addActivityLog(
                'processing', 
                'Vacancy Processing Started', 
                'Processing vacancy file from queue', 
                'processing',
                {
                    queueItem: queueItem,
                    timestamp: new Date().toISOString()
                }
            );

            // Download file from Azure Blob Storage and extract text
            const storageConnection = process.env.azure_storage_connection_string || '';
            const containerName = 'vacancy-files';

            const item = typeof queueItem === 'string' ? JSON.parse(queueItem) : (queueItem as any);
            const blobName: string = item?.uniqueFileName || '';
            const fileType: string = item?.fileType || '';
            const fileName: string = item?.fileName || '';

            if (!storageConnection || !blobName) {
                throw new Error('Missing storage connection or blob name from queue item');
            }

            context.log(`Processing vacancy file: ${fileName}`);

            const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnection);
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blobClient = containerClient.getBlobClient(blobName);
            const download = await blobClient.download();
            const buffer = await streamToBuffer(download.readableStreamBody || null);

            // Extract text based on mime type
            let vacancyText = '';
            if (fileType === 'application/pdf') {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const pdfParse = require('pdf-parse');
                const parsed = await pdfParse(buffer);
                vacancyText = parsed?.text || '';
            } else {
                vacancyText = buffer.toString('utf-8');
            }

            // Truncate to keep prompt reasonable
            const MAX_CHARS = 20000;
            if (vacancyText.length > MAX_CHARS) {
                vacancyText = vacancyText.slice(0, MAX_CHARS);
            }

            context.log(`Extracted text length: ${vacancyText.length} chars`);

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

                const prompt = `You are an assistant that extracts structured vacancy/job assignment information from documents. Read the following vacancy document and return STRICT JSON with these fields:

{
    "vacancy": {
        "title": string,
        "client": string,
        "description": string,
        "location": string,
        "duration": string (e.g., "3 months", "6 months", "1 year"),
        "remoteWork": boolean,
        "startDate": "YYYY-MM-DD" or null,
        "budget": string or null,
        "requirements": [
            {
                "type": "Technology" | "Role" | "Experience" | "Language" | "Certification" | "Soft Skill",
                "value": string,
                "isRequired": boolean,
                "priority": 1 | 2 | 3  (1=High, 2=Medium, 3=Low)
            }
        ]
    }
}

Important rules:
- Extract ALL requirements mentioned in the document
- Categorize each requirement appropriately:
  - Technology: Programming languages, frameworks, tools (e.g., "React", "Python", "Docker")
  - Role: Job titles, positions (e.g., "Senior Developer", "Team Lead")
  - Experience: Years of experience or specific experience requirements (e.g., "5+ years", "startup experience")
  - Language: Spoken languages (e.g., "English", "Dutch")
  - Certification: Required certifications (e.g., "AWS Certified", "Scrum Master")
  - Soft Skill: Non-technical skills (e.g., "Communication", "Leadership")
- Set isRequired based on words like "must have", "required", "mandatory" vs "nice to have", "preferred"
- Set priority: 1 for critical/required, 2 for important, 3 for nice-to-have
- If dates are vague (e.g., "Q1 2024"), estimate as best as possible
- If information is missing, use null for strings and empty arrays for lists
- Return ONLY valid JSON, no markdown formatting

Vacancy Document:
${vacancyText}`;

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
                        `Failed to analyze vacancy file: ${fileName}`,
                        'failed',
                        {
                            error: error instanceof Error ? error.message : 'Unknown error',
                            fileName
                        }
                    );
                    throw error;
                }
            } else {
                throw new Error('Azure OpenAI credentials not configured');
            }

            // Store vacancy in database
            const pool = await sql.connect(dbConfig);

            let assignmentId: number | null = null;
            let requirementsAdded = 0;

            if (analysisResult?.vacancy) {
                const vacancy = analysisResult.vacancy;

                try {
                    // Insert vacancy into ProjectAssignments table
                    const assignmentResult = await pool.request()
                        .input('title', sql.NVarChar(200), vacancy.title || 'Untitled Vacancy')
                        .input('description', sql.NVarChar(sql.MAX), vacancy.description)
                        .input('client', sql.NVarChar(100), vacancy.client)
                        .input('duration', sql.NVarChar(100), vacancy.duration)
                        .input('location', sql.NVarChar(100), vacancy.location)
                        .input('remoteWork', sql.Bit, vacancy.remoteWork || false)
                        .input('startDate', sql.Date, vacancy.startDate)
                        .input('budget', sql.NVarChar(100), vacancy.budget)
                        .query(`
                            INSERT INTO ProjectAssignments (Title, Description, Client, Duration, Location, RemoteWork, StartDate, Budget)
                            OUTPUT INSERTED.Id
                            VALUES (@title, @description, @client, @duration, @location, @remoteWork, @startDate, @budget)
                        `);

                    assignmentId = assignmentResult.recordset[0].Id;
                    context.log(`Inserted vacancy: ${vacancy.title} (ID: ${assignmentId})`);

                    // Insert requirements
                    if (vacancy.requirements && Array.isArray(vacancy.requirements)) {
                        for (const req of vacancy.requirements) {
                            try {
                                await pool.request()
                                    .input('assignmentId', sql.Int, assignmentId)
                                    .input('requirementType', sql.NVarChar(50), req.type)
                                    .input('requirementValue', sql.NVarChar(200), req.value)
                                    .input('isRequired', sql.Bit, req.isRequired !== undefined ? req.isRequired : true)
                                    .input('priority', sql.Int, req.priority || 2)
                                    .query(`
                                        INSERT INTO AssignmentRequirements (AssignmentId, RequirementType, RequirementValue, IsRequired, Priority)
                                        VALUES (@assignmentId, @requirementType, @requirementValue, @isRequired, @priority)
                                    `);
                                
                                requirementsAdded++;
                            } catch (reqError) {
                                context.error(`Error adding requirement ${req.value}:`, reqError);
                            }
                        }
                    }
                } catch (dbError) {
                    context.error(`Error adding vacancy:`, dbError);
                    throw dbError;
                }
            }

            await pool.close();

            // Log success
            await addActivityLog(
                'processing',
                'Vacancy Processing Completed',
                `Successfully processed ${fileName}. Added vacancy "${analysisResult?.vacancy?.title}" with ${requirementsAdded} requirements.`,
                'completed',
                {
                    fileName,
                    assignmentId,
                    vacancyTitle: analysisResult?.vacancy?.title,
                    requirementsAdded
                }
            );

            context.log(`Processing completed: Vacancy ID ${assignmentId}, ${requirementsAdded} requirements added`);

        } catch (error) {
            context.error('Error processing vacancy file:', error);
            
            await addActivityLog(
                'error',
                'Vacancy Processing Failed',
                `Failed to process vacancy file: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

