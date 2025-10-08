import { NextRequest } from 'next/server';
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { AzureOpenAI } from 'openai';
import { streamText } from 'ai';
import { createAzure } from '@ai-sdk/azure';

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
    certifications?: string[];
    tools?: string[];
    languagesSpoken?: string[];
}

const searchEndpoint = process.env.azure_search_endpoint!;
const searchKey = process.env.azure_search_key!;
const indexName = 'cv-candidates';

// Parse Azure OpenAI resource URL to get resource name
function parseAzureOpenAIResource(resourceUrl: string | undefined): { resourceName: string; deployment: string } {
    if (!resourceUrl) {
        return { resourceName: '', deployment: process.env.azure_openai_deployment || 'gpt-4o' };
    }
    
    const urlMatch = resourceUrl.match(/https:\/\/([^.]+)\.openai\.azure\.com\/openai\/deployments\/([^\/]+)/);
    if (urlMatch) {
        return { resourceName: urlMatch[1], deployment: urlMatch[2] };
    }
    return { resourceName: resourceUrl, deployment: process.env.azure_openai_deployment || 'gpt-4o' };
}

const { resourceName: openaiResource, deployment } = parseAzureOpenAIResource(process.env.azure_openai_resource);
const openaiKey = process.env.azure_openai_key || '';
const embeddingDeployment = process.env.azure_openai_embedding_deployment || 'text-embedding-ada-002';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content?: string;
    parts?: Array<{ type: string; text: string }>;
}

export async function POST(req: NextRequest) {
    try {
        // Check if required environment variables are configured
        if (!searchEndpoint || !searchKey || !openaiKey || !openaiResource) {
            return new Response(
                JSON.stringify({ error: 'Chat service not configured. Missing required environment variables.' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { messages } = await req.json() as { messages: Message[] };

        if (!messages || messages.length === 0) {
            return new Response('Messages are required', { status: 400 });
        }

        const lastMessage = messages[messages.length - 1];
        
        // Extract content from either content field or parts array
        let userQuery = '';
        if (lastMessage.content) {
            userQuery = lastMessage.content;
        } else if (lastMessage.parts && lastMessage.parts.length > 0) {
            // Find text part
            const textPart = lastMessage.parts.find(part => part.type === 'text');
            if (textPart) {
                userQuery = textPart.text;
            }
        }

        if (!userQuery || userQuery.trim() === '') {
            return new Response('User query cannot be empty', { status: 400 });
        }

        // Generate embedding for the query
        const openaiClient = new AzureOpenAI({
            apiKey: openaiKey,
            endpoint: `https://${openaiResource}.openai.azure.com`,
            apiVersion: '2024-02-01',
        });

        const embeddingResponse = await openaiClient.embeddings.create({
            model: embeddingDeployment,
            input: userQuery.trim(),
        });

        const queryVector = embeddingResponse.data[0].embedding;

        // Search Azure AI Search with hybrid approach (vector + keyword)
        const searchClient = new SearchClient(
            searchEndpoint,
            indexName,
            new AzureKeyCredential(searchKey)
        );

        const searchResults = await searchClient.search(userQuery, {
            vectorSearchOptions: {
                queries: [
                    {
                        kind: 'vector',
                        vector: queryVector,
                        kNearestNeighborsCount: 10,
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
            top: 10,
        });

        // Collect search results
        const candidates: Candidate[] = [];
        for await (const result of searchResults.results) {
            candidates.push({
                score: result.score,
                ...result.document,
            } as Candidate);
        }

        // Build context from search results
        let context = '';
        const citations: Array<{ name: string; userId: string }> = [];

        if (candidates.length === 0) {
            context = 'No candidates found matching the query.';
        } else {
            context = 'Here are the relevant candidates from our database:\n\n';
            candidates.forEach((candidate, index) => {
                citations.push({ name: candidate.name, userId: candidate.userId });
                context += `[${index + 1}] ${candidate.name}\n`;
                context += `   Seniority: ${candidate.seniority} | Experience: ${candidate.yearsOfExperience} years\n`;
                if (candidate.location) context += `   Location: ${candidate.location}\n`;
                if (candidate.summary) context += `   Summary: ${candidate.summary}\n`;
                if (candidate.skills && candidate.skills.length > 0) {
                    context += `   Skills: ${candidate.skills.join(', ')}\n`;
                }
                if (candidate.preferredRoles && candidate.preferredRoles.length > 0) {
                    context += `   Preferred Roles: ${candidate.preferredRoles.join(', ')}\n`;
                }
                if (candidate.projects) {
                    const projectPreview = candidate.projects.slice(0, 300);
                    context += `   Recent Projects: ${projectPreview}${candidate.projects.length > 300 ? '...' : ''}\n`;
                }
                context += '\n';
            });
        }

        // System prompt for the AI assistant
        const systemPrompt = `You are an AI assistant helping to search and analyze candidate CVs and profiles.
Your role is to:
1. Answer questions about candidates' skills, experience, and projects
2. Find candidates that match specific criteria
3. Compare candidates when asked
4. Provide insights about candidate qualifications
5. Be helpful and professional

Guidelines:
- Base your responses ONLY on the provided candidate data
- Reference candidates by name when discussing them
- Be specific about skills, experience levels, and projects
- If asked about something not in the data, say you don't have that information
- Use natural, conversational language
- When listing multiple candidates, prioritize by relevance to the query

Context data provided:
${context}`;

        // Create message history with system prompt
        const chatMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...messages.filter(m => m.role !== 'system').map(msg => ({
                role: msg.role,
                content: msg.content || (msg.parts?.find(p => p.type === 'text')?.text) || ''
            })),
        ];

        // Create Azure client
        const azure = createAzure({
            apiKey: openaiKey,
            resourceName: openaiResource,
        });

        // Stream the response
        const result = streamText({
            model: azure(deployment),
            messages: chatMessages,
            temperature: 0.7,
        });

        // Return streaming response
        return result.toTextStreamResponse({
            headers: {
                'X-Citations': JSON.stringify(citations),
            },
        });

    } catch (error) {
        console.error('Error in chat API:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to process chat request', details: error instanceof Error ? error.message : String(error) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

