import { app, InvocationContext } from '@azure/functions';
import * as sql from 'mssql';
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { AzureOpenAI } from 'openai';

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

const searchEndpoint = process.env.azure_search_endpoint || '';
const searchKey = process.env.azure_search_key || '';
const indexName = 'cv-candidates';

// Parse Azure OpenAI resource URL
function parseAzureOpenAIResource(resourceUrl: string | undefined): { resourceName: string } {
    if (!resourceUrl) return { resourceName: '' };
    const urlMatch = resourceUrl.match(/https:\/\/([^.]+)\.openai\.azure\.com/);
    if (urlMatch) return { resourceName: urlMatch[1] };
    return { resourceName: resourceUrl };
}

const { resourceName: openaiResource } = parseAzureOpenAIResource(process.env.azure_openai_resource);
const openaiKey = process.env.azure_openai_key || '';
const embeddingDeployment = process.env.azure_openai_embedding_deployment || 'text-embedding-ada-002';
const gptDeployment = process.env.azure_openai_deployment || 'gpt-4o';

interface Vacancy {
    Id: number;
    Title: string;
    Description: string | null;
    Client: string | null;
}

interface Requirement {
    RequirementType: string;
    RequirementValue: string;
    IsRequired: boolean;
    Priority: number;
}

interface Candidate {
    score?: number;
    userId: string;
    name: string;
    email?: string;
    seniority?: string;
    yearsOfExperience?: number;
    location?: string;
    summary?: string;
    skills?: string[];
    preferredRoles?: string[];
    projects?: string;
    tools?: string[];
    languagesSpoken?: string[];
    certifications?: string[];
}

interface EvaluatedCandidate extends Candidate {
    overallScore: number;
    matchedRequirements: string[];
    missingRequirements: string[];
    reasoning: string;
    requirementBreakdown: RequirementMatch[];
}

interface RequirementMatch {
    requirement: string;
    type: string;
    matched: boolean;
    evidence: string;
    isRequired: boolean;
    priority: number;
}

// LLM evaluation function
async function evaluateCandidateWithLLM(
    candidate: Candidate,
    requirements: Requirement[],
    openaiClient: AzureOpenAI
): Promise<EvaluatedCandidate> {
    try {
        const requiredReqs = requirements.filter(r => r.IsRequired);
        const optionalReqs = requirements.filter(r => !r.IsRequired);
        
        const prompt = `You are evaluating if a candidate matches a job vacancy requirements.

IMPORTANT: Be smart about implied skills and technology relationships:
- **Frontend Frameworks** (React, Vue, Angular, Svelte) imply: JavaScript/TypeScript, HTML, CSS, DOM manipulation, browser APIs
- **Backend Frameworks** (Express, NestJS, Django, Flask, Spring) imply: their base language (Node.js, Python, Java), REST APIs, HTTP, databases
- **Mobile** (React Native, Flutter) imply: their base framework (React, Dart) plus mobile-specific knowledge
- **Full-Stack** roles imply: both frontend and backend fundamentals
- **Senior/Lead** roles imply: the fundamentals of their specialty even if not explicitly listed
- **Related Technologies**: Next.js implies React; Gatsby implies React; Nuxt implies Vue; Angular Material implies Angular

When evaluating:
1. If a candidate lists "React", credit them for JavaScript, HTML, CSS knowledge (even if not explicitly listed)
2. If they list "Node.js + Express", credit them for REST API and backend fundamentals
3. If they're "Senior Frontend Developer", assume HTML/CSS/JS fundamentals
4. Use common sense about technology stacks and their prerequisites
5. Still require explicit evidence for specialized tools (Docker, Kubernetes, specific databases)

Be REASONABLE, not overly strict. Technology names vary (React.js = React = ReactJS).

Candidate Profile:
- Name: ${candidate.name}
- Years of Experience: ${candidate.yearsOfExperience || 'Not specified'}
- Seniority: ${candidate.seniority || 'Not specified'}
- Location: ${candidate.location || 'Not specified'}
- Skills: ${candidate.skills?.join(', ') || 'None listed'}
- Tools: ${candidate.tools?.join(', ') || 'None listed'}
- Certifications: ${candidate.certifications?.join(', ') || 'None listed'}
- Preferred Roles: ${candidate.preferredRoles?.join(', ') || 'None listed'}
- Projects: ${candidate.projects ? candidate.projects.substring(0, 1000) : 'None listed'}

Required Requirements (MUST match for high score):
${requiredReqs.map(r => `- ★ ${r.RequirementValue} (${r.RequirementType}, Priority: ${r.Priority === 1 ? 'High' : r.Priority === 2 ? 'Medium' : 'Low'})`).join('\n')}

Nice-to-Have Requirements (bonus points):
${optionalReqs.map(r => `- ☆ ${r.RequirementValue} (${r.RequirementType}, Priority: ${r.Priority === 1 ? 'High' : r.Priority === 2 ? 'Medium' : 'Low'})`).join('\n')}

Scoring Guidelines:
- Missing required requirements should significantly lower the score
- Each matched required requirement is worth more than optional ones
- Consider priority levels (1=High has more weight than 3=Low)
- Overall score should be 0-100

Return ONLY valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "matchedRequirements": ["<req1>", "<req2>"],
  "missingRequirements": ["<req1>", "<req2>"],
  "reasoning": "<brief explanation of the score>",
  "requirementBreakdown": [
    {
      "requirement": "<requirement name>",
      "type": "<requirement type>",
      "matched": <boolean>,
      "evidence": "<where/how it was found or why it's missing>",
      "isRequired": <boolean>,
      "priority": <1|2|3>
    }
  ]
}`;

        const response = await openaiClient.chat.completions.create({
            model: gptDeployment,
            messages: [
                {
                    role: 'system',
                    content: 'You are a technical recruiter evaluating candidate-job matches. Return only valid JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.1,
            max_tokens: 2000,
        });

        let jsonText = response.choices[0]?.message?.content?.trim() || '{}';
        
        // Clean up markdown code blocks if present
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }

        const evaluation = JSON.parse(jsonText);

        return {
            ...candidate,
            overallScore: evaluation.overallScore || 0,
            matchedRequirements: evaluation.matchedRequirements || [],
            missingRequirements: evaluation.missingRequirements || [],
            reasoning: evaluation.reasoning || 'No reasoning provided',
            requirementBreakdown: evaluation.requirementBreakdown || [],
        };
    } catch (error) {
        console.error(`Error evaluating candidate ${candidate.userId}:`, error);
        
        // Fallback
        return {
            ...candidate,
            overallScore: candidate.score ? Math.round(candidate.score * 100) : 0,
            matchedRequirements: [],
            missingRequirements: requirements.map(r => r.RequirementValue),
            reasoning: 'LLM evaluation failed, using vector similarity score as fallback',
            requirementBreakdown: requirements.map(r => ({
                requirement: r.RequirementValue,
                type: r.RequirementType,
                matched: false,
                evidence: 'Evaluation failed',
                isRequired: r.IsRequired,
                priority: r.Priority,
            })),
        };
    }
}

function buildSearchQuery(vacancy: Vacancy, requirements: Requirement[]): string {
    const parts: string[] = [];

    if (vacancy.Title) {
        parts.push(`Job Title: ${vacancy.Title}`);
    }

    if (vacancy.Description) {
        parts.push(`Description: ${vacancy.Description}`);
    }

    if (vacancy.Client) {
        parts.push(`Client: ${vacancy.Client}`);
    }

    const requirementsByType = requirements.reduce((acc, req) => {
        if (!acc[req.RequirementType]) {
            acc[req.RequirementType] = [];
        }
        acc[req.RequirementType].push(req.RequirementValue);
        return acc;
    }, {} as Record<string, string[]>);

    Object.entries(requirementsByType).forEach(([type, values]) => {
        parts.push(`${type}: ${values.join(', ')}`);
    });

    return parts.join('\n');
}

// Queue trigger function for vacancy matching
app.storageQueue('vacancyMatching', {
    queueName: 'vacancy-matching-queue',
    connection: 'AzureWebJobsStorage',
    handler: async (queueItem: unknown, context: InvocationContext): Promise<void> => {
        context.log('Vacancy Matching function triggered');
        context.log('Queue item:', queueItem);

        try {
            const item = typeof queueItem === 'string' ? JSON.parse(queueItem) : (queueItem as any);
            const vacancyId: number = item?.vacancyId;

            if (!vacancyId) {
                throw new Error('Invalid vacancyId in queue message');
            }

            context.log(`Processing matching for vacancy ID: ${vacancyId}`);

            // Connect to database
            const pool = await sql.connect(dbConfig);

            // Fetch vacancy details
            const vacancyQuery = `
                SELECT Id, Title, Description, Client
                FROM ProjectAssignments
                WHERE Id = @vacancyId
            `;
            const vacancyResult = await pool.request()
                .input('vacancyId', sql.Int, vacancyId)
                .query(vacancyQuery);

            if (vacancyResult.recordset.length === 0) {
                throw new Error(`Vacancy not found: ${vacancyId}`);
            }

            const vacancy = vacancyResult.recordset[0] as Vacancy;

            // Fetch requirements
            const requirementsQuery = `
                SELECT RequirementType, RequirementValue, IsRequired, Priority
                FROM AssignmentRequirements
                WHERE AssignmentId = @vacancyId
                ORDER BY Priority ASC, IsRequired DESC
            `;
            const requirementsResult = await pool.request()
                .input('vacancyId', sql.Int, vacancyId)
                .query(requirementsQuery);

            const requirements = requirementsResult.recordset as Requirement[];

            context.log(`Found ${requirements.length} requirements for vacancy "${vacancy.Title}"`);

            // Build search query
            const searchText = buildSearchQuery(vacancy, requirements);

            // Generate embedding
            const openaiClient = new AzureOpenAI({
                apiKey: openaiKey,
                endpoint: `https://${openaiResource}.openai.azure.com`,
                apiVersion: '2024-02-01',
            });

            const embeddingResponse = await openaiClient.embeddings.create({
                model: embeddingDeployment,
                input: searchText,
            });

            const queryVector = embeddingResponse.data[0].embedding;

            // Search Azure AI Search
            const searchClient = new SearchClient(
                searchEndpoint,
                indexName,
                new AzureKeyCredential(searchKey)
            );

            const searchResults = await searchClient.search('*', {
                vectorSearchOptions: {
                    queries: [
                        {
                            kind: 'vector',
                            vector: queryVector,
                            kNearestNeighborsCount: 20,
                            fields: ['contentVector'],
                        },
                    ],
                },
                select: [
                    'userId',
                    'name',
                    'email',
                    'summary',
                    'skills',
                    'yearsOfExperience',
                    'seniority',
                    'projects',
                    'certifications',
                    'preferredRoles',
                    'location',
                    'tools',
                    'languagesSpoken',
                ],
                top: 20,
            });

            // Collect candidates
            const candidates: Candidate[] = [];
            for await (const result of searchResults.results) {
                candidates.push({
                    score: result.score,
                    ...result.document,
                } as Candidate);
            }

            context.log(`Found ${candidates.length} candidates from vector search, evaluating with LLM...`);

            // Evaluate all candidates in parallel
            const evaluationPromises = candidates.map(candidate =>
                evaluateCandidateWithLLM(candidate, requirements, openaiClient)
            );

            const evaluatedCandidates = await Promise.all(evaluationPromises);

            context.log(`Evaluated ${evaluatedCandidates.length} candidates, storing results...`);

            // Delete old matching results for this vacancy
            await pool.request()
                .input('vacancyId', sql.Int, vacancyId)
                .query('DELETE FROM MatchingResults WHERE AssignmentId = @vacancyId');

            // Store all results in database
            let storedCount = 0;
            for (const candidate of evaluatedCandidates) {
                try {
                    await pool.request()
                        .input('assignmentId', sql.Int, vacancyId)
                        .input('userId', sql.Int, parseInt(candidate.userId, 10))
                        .input('score', sql.Decimal(5, 2), candidate.score || 0)
                        .input('overallScore', sql.Decimal(5, 2), candidate.overallScore)
                        .input('matchedRequirements', sql.NVarChar(sql.MAX), JSON.stringify(candidate.matchedRequirements))
                        .input('missingRequirements', sql.NVarChar(sql.MAX), JSON.stringify(candidate.missingRequirements))
                        .input('reasoning', sql.NVarChar(sql.MAX), candidate.reasoning)
                        .input('requirementBreakdown', sql.NVarChar(sql.MAX), JSON.stringify(candidate.requirementBreakdown))
                        .input('evaluationVersion', sql.Int, 1)
                        .query(`
                            INSERT INTO MatchingResults (
                                AssignmentId, UserId, Score, OverallScore,
                                MatchedRequirements, MissingRequirements, Reasoning,
                                RequirementBreakdown, LastEvaluatedAt, EvaluationVersion
                            )
                            VALUES (
                                @assignmentId, @userId, @score, @overallScore,
                                @matchedRequirements, @missingRequirements, @reasoning,
                                @requirementBreakdown, GETUTCDATE(), @evaluationVersion
                            )
                        `);
                    storedCount++;
                } catch (insertError) {
                    context.error(`Error storing result for user ${candidate.userId}:`, insertError);
                }
            }

            await pool.close();

            context.log(`Vacancy matching completed: ${storedCount} results stored for vacancy ID ${vacancyId}`);

            // Log activity (via API)
            try {
                await fetch(`${process.env.next_public_base_url}/api/activity-log`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'matching',
                        title: 'Vacancy Matching Completed',
                        description: `Evaluated ${evaluatedCandidates.length} candidates for vacancy "${vacancy.Title}"`,
                        status: 'completed',
                        metadata: {
                            vacancyId,
                            vacancyTitle: vacancy.Title,
                            candidatesEvaluated: evaluatedCandidates.length,
                            resultsStored: storedCount
                        }
                    }),
                });
            } catch (logError) {
                context.error('Error logging activity:', logError);
            }

        } catch (error) {
            context.error('Error processing vacancy matching:', error);

            // Log error activity
            try {
                await fetch(`${process.env.next_public_base_url}/api/activity-log`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'error',
                        title: 'Vacancy Matching Failed',
                        description: `Failed to match candidates: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        status: 'failed',
                        metadata: {
                            error: error instanceof Error ? error.message : 'Unknown error'
                        }
                    }),
                });
            } catch (logError) {
                context.error('Error logging activity:', logError);
            }

            throw error;
        }
    }
});

