import { app, InvocationContext } from '@azure/functions';
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { AzureOpenAI } from 'openai';
import * as sql from 'mssql';

const dbConfig: sql.config = {
    server: process.env.azure_sql_server!,
    database: process.env.azure_sql_database!,
    user: process.env.azure_sql_user!,
    password: process.env.azure_sql_password!,
    options: {
        encrypt: true,
        trustServerCertificate: false,
    },
};

const searchEndpoint = process.env.azure_search_endpoint!;
const searchKey = process.env.azure_search_key!;
const indexName = 'cv-candidates';

// Parse Azure OpenAI resource URL to get resource name and deployment
function parseAzureOpenAIResource(resourceUrl: string): { resourceName: string; deployment: string } {
    const urlMatch = resourceUrl.match(/https:\/\/([^.]+)\.openai\.azure\.com\/openai\/deployments\/([^\/]+)/);
    if (urlMatch) {
        return { resourceName: urlMatch[1], deployment: urlMatch[2] };
    }
    // Fallback: assume it's just the resource name
    return { resourceName: resourceUrl, deployment: process.env.azure_openai_deployment || 'gpt-4o' };
}

const { resourceName: openaiResource } = parseAzureOpenAIResource(process.env.azure_openai_resource!);
const openaiKey = process.env.azure_openai_key!;
const embeddingDeployment = process.env.azure_openai_embedding_deployment || 'text-embedding-ada-002';

// Helper function to add activity log
async function addActivityLog(
    type: string,
    title: string,
    description: string,
    status: string,
    metadata?: Record<string, unknown>,
    userId?: number,
    fileName?: string
) {
    try {
        const response = await fetch(`${process.env.next_public_base_url}/api/activity-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                title,
                description,
                status,
                metadata,
                userId,
                fileName,
            }),
        });

        if (!response.ok) {
            console.error('Failed to log activity:', await response.text());
        }
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

export async function indexCVFunction(queueItem: unknown, context: InvocationContext): Promise<void> {
    context.log('CV indexing triggered for:', queueItem);

    let userId: number;
    
    // Handle different queue message formats
    if (typeof queueItem === 'string') {
        try {
            const message = JSON.parse(queueItem);
            userId = message.userId;
        } catch {
            userId = parseInt(queueItem, 10);
        }
    } else if (typeof queueItem === 'object' && queueItem !== null) {
        // Direct object from queue
        userId = (queueItem as any).userId;
    } else {
        userId = parseInt(String(queueItem), 10);
    }

    if (!userId || isNaN(userId)) {
        context.error('Invalid userId in queue message:', queueItem);
        return;
    }

    await addActivityLog(
        'indexing',
        'Indexing Started',
        `Started indexing candidate data for user ID: ${userId}`,
        'in_progress',
        { userId }
    );

    try {
        // Connect to database
        const pool = await sql.connect(dbConfig);

        // Fetch user data
        const userResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    u.Id, u.Name, u.Email, u.Phone, u.Location, u.LinkedInProfile
                FROM Users u
                WHERE u.Id = @userId
            `);

        if (userResult.recordset.length === 0) {
            context.error('User not found:', userId);
            await addActivityLog(
                'indexing',
                'Indexing Failed',
                `User not found: ${userId}`,
                'failed',
                { userId }
            );
            return;
        }

        const user = userResult.recordset[0];

        // Fetch projects with technologies
        const projectsResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT p.Id, p.Title, p.Description, p.StartDate, p.EndDate, p.Role, p.Company
                FROM Projects p
                WHERE p.UserId = @userId
                ORDER BY p.StartDate DESC
            `);

        // Fetch technologies for each project
        const techResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT t.ProjectId, t.Category, t.Technology
                FROM Technologies t
                INNER JOIN Projects p ON t.ProjectId = p.Id
                WHERE p.UserId = @userId
                ORDER BY t.Category, t.Technology
            `);

        // Fetch dynamic fields
        const dynamicResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT FieldId, FieldValue
                FROM UserDynamicFields
                WHERE UserId = @userId
            `);

        await pool.close();

        // Process data
        const skills: string[] = [];
        const tools: string[] = [];
        const certifications: string[] = [];
        const preferredRoles: string[] = [];
        const languagesSpoken: string[] = [];
        const programmingLanguages: string[] = [];
        const designTools: string[] = [];
        const mobilePlatforms: string[] = [];
        let yearsOfExperience = 0;
        let portfolioURL = '';
        let githubProfile = '';
        let arvr = '';

        // Group technologies by category (from Projects -> Technologies)
        const techByCategory: Record<string, string[]> = {};
        for (const tech of techResult.recordset) {
            if (!techByCategory[tech.Category]) {
                techByCategory[tech.Category] = [];
            }
            techByCategory[tech.Category].push(tech.Technology);
            skills.push(tech.Technology);
        }

        // Process dynamic fields (from CV analysis)
        for (const field of dynamicResult.recordset) {
            try {
                const value = field.FieldValue;
                let parsedValue;
                
                // Try to parse as JSON, fallback to string
                try {
                    parsedValue = JSON.parse(value);
                } catch {
                    parsedValue = value;
                }

                // Map field IDs to their meanings (from schema)
                if (field.FieldId === 1) {
                    // ProgrammingLanguages
                    const langs = Array.isArray(parsedValue) ? parsedValue : [parsedValue];
                    programmingLanguages.push(...langs);
                    skills.push(...langs);
                } else if (field.FieldId === 2) {
                    // DesignTools
                    const tools_list = Array.isArray(parsedValue) ? parsedValue : [parsedValue];
                    designTools.push(...tools_list);
                    tools.push(...tools_list);
                } else if (field.FieldId === 3) {
                    // ARVRExperience
                    arvr = String(parsedValue);
                } else if (field.FieldId === 4) {
                    // MobilePlatforms
                    const platforms = Array.isArray(parsedValue) ? parsedValue : [parsedValue];
                    mobilePlatforms.push(...platforms);
                    skills.push(...platforms);
                } else if (field.FieldId === 5) {
                    // Certifications
                    const certs = Array.isArray(parsedValue) ? parsedValue : [parsedValue];
                    certifications.push(...certs);
                } else if (field.FieldId === 6) {
                    // Languages
                    const langs = Array.isArray(parsedValue) ? parsedValue : [parsedValue];
                    languagesSpoken.push(...langs);
                } else if (field.FieldId === 7) {
                    // YearsOfExperience
                    yearsOfExperience = parseInt(String(parsedValue)) || 0;
                } else if (field.FieldId === 8) {
                    // PortfolioURL
                    portfolioURL = String(parsedValue);
                } else if (field.FieldId === 9) {
                    // GitHubProfile
                    githubProfile = String(parsedValue);
                }
            } catch (e) {
                context.warn('Failed to parse dynamic field:', field.FieldId, field.FieldValue, e);
            }
        }

        // Build project descriptions with technologies
        const projectDescriptions = projectsResult.recordset.map(p => {
            const projectTechs = techResult.recordset
                .filter(t => t.ProjectId === p.Id)
                .map(t => t.Technology);
            
            return `${p.Title} (${p.Role} at ${p.Company}, ${p.StartDate} - ${p.EndDate}): ${p.Description}
Technologies: ${projectTechs.join(', ')}`;
        }).join('\n\n');

        // Create comprehensive content for embedding
        const content = `
Name: ${user.Name}
Email: ${user.Email}
Location: ${user.Location || 'Not specified'}
Years of Experience: ${yearsOfExperience}

Programming Languages: ${programmingLanguages.join(', ')}
Skills & Technologies: ${skills.join(', ')}
Design Tools: ${designTools.join(', ')}
Mobile Platforms: ${mobilePlatforms.join(', ')}
Tools: ${tools.join(', ')}
AR/VR Experience: ${arvr}

Languages Spoken: ${languagesSpoken.join(', ')}
Certifications: ${certifications.join(', ')}

Portfolio: ${portfolioURL}
GitHub: ${githubProfile}
LinkedIn: ${user.LinkedInProfile || ''}

Projects:
${projectDescriptions}

Technology Categories:
${Object.entries(techByCategory).map(([category, techs]) => `${category}: ${techs.join(', ')}`).join('\n')}
        `.trim();
        context.log('Content being indexed:', content);
        // Generate embedding using Azure OpenAI
        context.log('Generating embedding for user:', userId);
        const openaiClient = new AzureOpenAI({
            apiKey: openaiKey,
            endpoint: `https://${openaiResource}.openai.azure.com`,
            apiVersion: '2024-02-01',
        });

        const embeddingResponse = await openaiClient.embeddings.create({
            model: embeddingDeployment,
            input: content,
        });

        const embedding = embeddingResponse.data[0].embedding;

        // Create search document
        const searchDoc = {
            userId: userId.toString(),
            name: user.Name || 'Unknown',
            email: user.Email || '',
            summary: `${yearsOfExperience} years experience in ${programmingLanguages.slice(0, 3).join(', ')}`, // Generated summary
            skills: [...skills, ...programmingLanguages, ...designTools, ...mobilePlatforms], // All skills combined
            yearsOfExperience,
            seniority: yearsOfExperience >= 7 ? 'senior' : yearsOfExperience >= 3 ? 'mid' : 'junior', // Calculated seniority
            projects: projectDescriptions,
            certifications,
            preferredRoles,
            location: user.Location || '',
            tools: [...tools, ...designTools], // All tools combined
            languagesSpoken,
            content,
            contentVector: embedding,
            lastUpdated: new Date().toISOString(),
        };

        // Index document in Azure AI Search
        context.log('Indexing document for user:', userId);
        context.log('Skills being indexed:', searchDoc.skills.slice(0, 10)); // Log first 10 skills
        context.log('Content preview:', content.slice(0, 500)); // Log first 500 chars of content
        
        const searchClient = new SearchClient(
            searchEndpoint,
            indexName,
            new AzureKeyCredential(searchKey)
        );

        await searchClient.uploadDocuments([searchDoc]);

        // Update user record to mark as indexed
        const updatePool = await sql.connect(dbConfig);
        await updatePool.request()
            .input('userId', sql.Int, userId)
            .query(`
                UPDATE Users 
                SET IsIndexed = 1, LastIndexedAt = GETUTCDATE(), IndexVersion = 1
                WHERE Id = @userId
            `);
        await updatePool.close();

        context.log(`Successfully indexed user: ${userId}`);

        await addActivityLog(
            'indexing',
            'Indexing Completed',
            `Successfully indexed candidate: ${user.Name}`,
            'completed',
            { 
                userId,
                skillsCount: skills.length,
                projectsCount: projectsResult.recordset.length
            }
        );

    } catch (error) {
        // Check if error is due to connection being closed (concurrent access issue)
        const isConnectionClosed = error instanceof Error && 
            (error.message.includes('Connection is closed') || 
             (error as any).code === 'ECONNCLOSED');
        
        if (isConnectionClosed) {
            context.warn('Connection closed during indexing (concurrent access detected) - will retry automatically:', error);
            await addActivityLog(
                'indexing',
                'Indexing Queued for Retry',
                `Indexing paused due to concurrent access. Azure Functions will automatically retry (${userId ? `User ID: ${userId}` : 'Unknown user'})`,
                'pending',
                { userId, retryReason: 'connection_closed', willRetry: true }
            );
        } else {
            context.error('Error indexing CV:', error);
            await addActivityLog(
                'indexing',
                'Indexing Failed',
                `Failed to index candidate data: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'failed',
                { userId, error: String(error) }
            );
        }
        throw error;
    }
}

app.storageQueue('indexCV', {
    queueName: 'cv-indexing-queue',
    connection: 'AzureWebJobsStorage',
    handler: indexCVFunction,
});

