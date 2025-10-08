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

// Queue trigger function using v4 programming model
app.storageQueue('cvProcessing', {
    queueName: 'cv-processing-queue',
    connection: 'AzureWebJobsStorage',
    handler: async (queueItem: unknown, context: InvocationContext): Promise<void> => {
        context.log('CV Processing function triggered');
        context.log('Queue item:', queueItem);

        try {
            // Log processing started
            await addActivityLog(
                'processing', 
                'CV Processing Started', 
                'Processing CV file from queue', 
                'processing',
                {
                    queueItem: queueItem,
                    timestamp: new Date().toISOString()
                }
            );

            // Download CV from Azure Blob Storage and extract text
            const storageConnection = process.env.azure_storage_connection_string || '';
            const containerName = 'cv-files';

            const item = typeof queueItem === 'string' ? JSON.parse(queueItem) : (queueItem as any);
            const blobName: string = item?.uniqueFileName || '';
            const fileType: string = item?.fileType || '';

            if (!storageConnection || !blobName) {
                throw new Error('Missing storage connection or blob name from queue item');
            }

            const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnection);
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blobClient = containerClient.getBlobClient(blobName);
            const download = await blobClient.download();
            const buffer = await streamToBuffer(download.readableStreamBody);

            // Extract text based on mime type
            let cvText = '';
            if (fileType === 'application/pdf') {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const pdfParse = require('pdf-parse');
                const parsed = await pdfParse(buffer);
                cvText = parsed?.text || '';
            } else {
                cvText = buffer.toString('utf-8');
            }

            // Truncate to keep prompt reasonable
            const MAX_CHARS = 20000;
            if (cvText.length > MAX_CHARS) {
                cvText = cvText.slice(0, MAX_CHARS);
            }

            let analysisResult: unknown = null;

            // Run AI analysis if credentials are configured
            if (azure_openai_key && azure_openai_resource) {
                // Parse the Azure OpenAI endpoint
                let resourceName = '';
                let deployment = azure_openai_deployment || 'gpt-4o';

                // Check if azure_openai_resource is a full URL or just a resource name
                if (azure_openai_resource.startsWith('http')) {
                    // Extract resource name from full URL
                    // Format: https://RESOURCE-NAME.openai.azure.com/...
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

                const prompt = `You are an assistant that extracts structured candidate information for a software company focused on web development, mobile development, UI/UX design, and AR/VR. Read the following CV text and return STRICT JSON with these fields:\n{
                                "name": string,
                                "email": string,
                                "phone": string,
                                "location": string,
                                "linkedInProfile": string,
                                "summary": string,
                                "yearsOfExperience": number,
                                "seniority": "junior" | "mid" | "senior" | "lead",
                                "skills": {
                                    "web": string[],
                                    "mobile": string[],
                                    "uiux": string[],
                                    "arvr": string[],
                                    "other": string[]
                                },
                                "tools": string[],
                                "languagesSpoken": string[],
                                "notableProjects": [{ "name": string, "description": string, "technologies": string[], "startDate": string, "endDate": string, "role": string, "company": string }],
                                "certifications": string[],
                                "preferredRoles": string[],
                                "portfolioURL": string,
                                "githubProfile": string,
                                "behanceProfile": string
                                }\nOnly output JSON. CV Text:\n\n${cvText}`;

                const { text } = await generateText({
                    model: azure(deployment),
                    prompt,
                    temperature: 0.2,
                });

                try {
                    // Strip markdown code fences if present
                    let cleanedText = text.trim();
                    if (cleanedText.startsWith('```json')) {
                        cleanedText = cleanedText.slice(7); // Remove ```json
                    } else if (cleanedText.startsWith('```')) {
                        cleanedText = cleanedText.slice(3); // Remove ```
                    }
                    if (cleanedText.endsWith('```')) {
                        cleanedText = cleanedText.slice(0, -3); // Remove trailing ```
                    }
                    cleanedText = cleanedText.trim();
                    
                    analysisResult = JSON.parse(cleanedText);
                    context.log('✅ AI analysis parsed successfully');
                } catch (parseError) {
                    context.log('❌ Failed to parse AI response as JSON:', text.slice(0, 500));
                    analysisResult = { raw: text } as unknown;
                }

                // Save analysis to database
                context.log('Checking if analysis has name field:', analysisResult && typeof analysisResult === 'object' && 'name' in analysisResult);
                if (analysisResult && typeof analysisResult === 'object' && 'name' in analysisResult) {
                    try {
                        const pool = await sql.connect(dbConfig);
                        const data = analysisResult as any;

                        // Create or find user
                        let userId: number;
                        const userResult = await pool.request()
                            .input('email', sql.NVarChar(100), data.email || `temp_${Date.now()}@cvtool.local`)
                            .query('SELECT Id FROM Users WHERE Email = @email');

                        if (userResult.recordset.length > 0) {
                            userId = userResult.recordset[0].Id;
                            // Update existing user
                            await pool.request()
                                .input('userId', sql.Int, userId)
                                .input('name', sql.NVarChar(100), data.name || 'Unknown')
                                .input('phone', sql.NVarChar(20), data.phone || null)
                                .input('location', sql.NVarChar(100), data.location || null)
                                .input('linkedIn', sql.NVarChar(200), data.linkedInProfile || null)
                                .query('UPDATE Users SET Name = @name, Phone = @phone, Location = @location, LinkedInProfile = @linkedIn, UpdatedAt = GETUTCDATE() WHERE Id = @userId');
                        } else {
                            // Insert new user
                            const insertResult = await pool.request()
                                .input('name', sql.NVarChar(100), data.name || 'Unknown')
                                .input('email', sql.NVarChar(100), data.email || `temp_${Date.now()}@cvtool.local`)
                                .input('phone', sql.NVarChar(20), data.phone || null)
                                .input('location', sql.NVarChar(100), data.location || null)
                                .input('linkedIn', sql.NVarChar(200), data.linkedInProfile || null)
                                .query('INSERT INTO Users (Name, Email, Phone, Location, LinkedInProfile) OUTPUT INSERTED.Id VALUES (@name, @email, @phone, @location, @linkedIn)');
                            userId = insertResult.recordset[0].Id;
                        }

                        // Insert CV file record
                        await pool.request()
                            .input('userId', sql.Int, userId)
                            .input('fileName', sql.NVarChar(200), item.fileName || blobName)
                            .input('filePath', sql.NVarChar(500), item.blobUrl || '')
                            .input('fileSize', sql.Int, item.fileSize || 0)
                            .input('status', sql.NVarChar(50), 'Completed')
                            .query('INSERT INTO CVFiles (UserId, FileName, FilePath, FileSize, ProcessingStatus) VALUES (@userId, @fileName, @filePath, @fileSize, @status)');

                        // Insert projects from notableProjects
                        if (data.notableProjects && Array.isArray(data.notableProjects)) {
                            for (const project of data.notableProjects) {
                                const projectResult = await pool.request()
                                    .input('userId', sql.Int, userId)
                                    .input('title', sql.NVarChar(200), project.name || 'Untitled Project')
                                    .input('company', sql.NVarChar(100), project.company || 'Unknown')
                                    .input('role', sql.NVarChar(100), project.role || null)
                                    .input('description', sql.NVarChar(sql.MAX), project.description || null)
                                    .query('INSERT INTO Projects (UserId, Title, Company, Role, Description) OUTPUT INSERTED.Id VALUES (@userId, @title, @company, @role, @description)');
                                
                                const projectId = projectResult.recordset[0].Id;

                                // Insert technologies for this project
                                if (project.technologies && Array.isArray(project.technologies)) {
                                    for (const tech of project.technologies) {
                                        await pool.request()
                                            .input('projectId', sql.Int, projectId)
                                            .input('technology', sql.NVarChar(100), tech)
                                            .query('INSERT INTO Technologies (ProjectId, Technology) VALUES (@projectId, @technology)');
                                    }
                                }
                            }
                        }

                        // Insert dynamic fields
                        if (data.yearsOfExperience) {
                            await pool.request()
                                .input('userId', sql.Int, userId)
                                .input('fieldId', sql.Int, 7) // YearsOfExperience
                                .input('value', sql.NVarChar(sql.MAX), data.yearsOfExperience.toString())
                                .query('INSERT INTO UserDynamicFields (UserId, FieldId, FieldValue) VALUES (@userId, @fieldId, @value)');
                        }

                        if (data.portfolioURL) {
                            await pool.request()
                                .input('userId', sql.Int, userId)
                                .input('fieldId', sql.Int, 8) // PortfolioURL
                                .input('value', sql.NVarChar(sql.MAX), data.portfolioURL)
                                .query('INSERT INTO UserDynamicFields (UserId, FieldId, FieldValue) VALUES (@userId, @fieldId, @value)');
                        }

                        if (data.githubProfile) {
                            await pool.request()
                                .input('userId', sql.Int, userId)
                                .input('fieldId', sql.Int, 9) // GitHubProfile
                                .input('value', sql.NVarChar(sql.MAX), data.githubProfile)
                                .query('INSERT INTO UserDynamicFields (UserId, FieldId, FieldValue) VALUES (@userId, @fieldId, @value)');
                        }

                        if (data.behanceProfile) {
                            await pool.request()
                                .input('userId', sql.Int, userId)
                                .input('fieldId', sql.Int, 10) // BehanceProfile
                                .input('value', sql.NVarChar(sql.MAX), data.behanceProfile)
                                .query('INSERT INTO UserDynamicFields (UserId, FieldId, FieldValue) VALUES (@userId, @fieldId, @value)');
                        }

                        if (data.certifications && Array.isArray(data.certifications)) {
                            await pool.request()
                                .input('userId', sql.Int, userId)
                                .input('fieldId', sql.Int, 5) // Certifications
                                .input('value', sql.NVarChar(sql.MAX), JSON.stringify(data.certifications))
                                .query('INSERT INTO UserDynamicFields (UserId, FieldId, FieldValue) VALUES (@userId, @fieldId, @value)');
                        }

                        if (data.languagesSpoken && Array.isArray(data.languagesSpoken)) {
                            await pool.request()
                                .input('userId', sql.Int, userId)
                                .input('fieldId', sql.Int, 6) // Languages
                                .input('value', sql.NVarChar(sql.MAX), JSON.stringify(data.languagesSpoken))
                                .query('INSERT INTO UserDynamicFields (UserId, FieldId, FieldValue) VALUES (@userId, @fieldId, @value)');
                        }

                        await pool.close();
                        context.log(`✅ Successfully saved CV analysis to database for user ID: ${userId}`);
                    } catch (dbError) {
                        context.error('❌ Error saving CV analysis to database:', dbError);
                        // Re-throw to see full error
                        throw dbError;
                    }
                } else {
                    context.log('⚠️ Analysis result does not have required name field. Raw result:', analysisResult);
                }

                await addActivityLog(
                    'processing',
                    'AI Analysis Completed',
                    'Extracted candidate profile from CV',
                    'completed',
                    {
                        queueItem: item,
                        analysisPreview: (analysisResult as any)?.summary || (analysisResult as any)?.raw?.slice?.(0, 200) || null,
                    }
                );
            } else {
                await addActivityLog(
                    'processing',
                    'AI Analysis Skipped',
                    'Azure OpenAI credentials not configured',
                    'pending',
                    { queueItem: item }
                );
            }

            // Log processing finished
            await addActivityLog(
                'completed', 
                'CV Processing Completed', 
                'CV file processed successfully', 
                'completed',
                {
                    queueItem: (typeof queueItem === 'string' ? JSON.parse(queueItem) : queueItem),
                    aiIncluded: Boolean(azure_openai_key && azure_openai_resource && azure_openai_deployment),
                    timestamp: new Date().toISOString()
                }
            );

            context.log('CV processing completed successfully');

        } catch (error) {
            context.error('Error processing CV:', error);
            
            // Log processing error
            await addActivityLog(
                'error', 
                'CV Processing Failed', 
                'Error occurred during CV processing', 
                'failed',
                {
                    error: error instanceof Error ? error.message : String(error),
                    timestamp: new Date().toISOString()
                }
            );

            throw error;
        }
    }
});

async function streamToBuffer(readable: NodeJS.ReadableStream | null): Promise<Buffer> {
    if (!readable) return Buffer.alloc(0)
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        readable.on('data', (data: Buffer) => chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data)))
        readable.on('end', () => resolve(Buffer.concat(chunks)))
        readable.on('error', reject)
    })
}
