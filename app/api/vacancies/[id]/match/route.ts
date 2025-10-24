import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { SearchClient, AzureKeyCredential } from '@azure/search-documents'
import { AzureOpenAI } from 'openai'

interface Vacancy {
  Id: number
  Title: string
  Description: string | null
  Client: string | null
}

interface Requirement {
  RequirementType: string
  RequirementValue: string
  IsRequired: boolean
  Priority: number
}

interface Candidate {
  score?: number
  userId: string
  name: string
  email?: string
  seniority?: string
  yearsOfExperience?: number
  location?: string
  summary?: string
  skills?: string[]
  preferredRoles?: string[]
  projects?: string
  tools?: string[]
  languagesSpoken?: string[]
  certifications?: string[]
}

interface EvaluatedCandidate extends Candidate {
  overallScore: number
  matchedRequirements: string[]
  missingRequirements: string[]
  reasoning: string
  requirementBreakdown: RequirementMatch[]
}

interface RequirementMatch {
  requirement: string
  type: string
  matched: boolean
  evidence: string
  isRequired: boolean
  priority: number
}

const searchEndpoint = process.env.azure_search_endpoint!
const searchKey = process.env.azure_search_key!
const indexName = 'cv-candidates'

// Parse Azure OpenAI resource URL to get resource name
function parseAzureOpenAIResource(resourceUrl: string | undefined): { resourceName: string } {
  if (!resourceUrl) {
    return { resourceName: '' }
  }

  const urlMatch = resourceUrl.match(/https:\/\/([^.]+)\.openai\.azure\.com/)
  if (urlMatch) {
    return { resourceName: urlMatch[1] }
  }
  return { resourceName: resourceUrl }
}

const { resourceName: openaiResource } = parseAzureOpenAIResource(process.env.azure_openai_resource)
const openaiKey = process.env.azure_openai_key || ''
const embeddingDeployment = process.env.azure_openai_embedding_deployment || 'text-embedding-ada-002'
const gptDeployment = process.env.azure_openai_deployment || 'gpt-4o'

// LLM evaluation function
async function evaluateCandidateWithLLM(
  candidate: Candidate,
  requirements: Requirement[],
  openaiClient: AzureOpenAI
): Promise<EvaluatedCandidate> {
  try {
    // Build the evaluation prompt
    const requiredReqs = requirements.filter(r => r.IsRequired)
    const optionalReqs = requirements.filter(r => !r.IsRequired)
    
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
}`

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
    })

    let jsonText = response.choices[0]?.message?.content?.trim() || '{}'
    
    // Clean up markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }

    const evaluation = JSON.parse(jsonText)

    return {
      ...candidate,
      overallScore: evaluation.overallScore || 0,
      matchedRequirements: evaluation.matchedRequirements || [],
      missingRequirements: evaluation.missingRequirements || [],
      reasoning: evaluation.reasoning || 'No reasoning provided',
      requirementBreakdown: evaluation.requirementBreakdown || [],
    }
  } catch (error) {
    console.error(`Error evaluating candidate ${candidate.userId}:`, error)
    
    // Fallback to vector score if LLM fails
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
    }
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const vacancyId = parseInt(params.id)

    if (isNaN(vacancyId)) {
      return NextResponse.json({ error: 'Invalid vacancy ID' }, { status: 400 })
    }

    // Fetch vacancy details
    const vacancyQuery = `
      SELECT Id, Title, Description, Client
      FROM ProjectAssignments
      WHERE Id = @vacancyId
    `
    const vacancies = await executeQuery<Vacancy>(vacancyQuery, { vacancyId })

    if (vacancies.length === 0) {
      return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 })
    }

    const vacancy = vacancies[0]

    // Fetch requirements
    const requirementsQuery = `
      SELECT RequirementType, RequirementValue, IsRequired, Priority
      FROM AssignmentRequirements
      WHERE AssignmentId = @vacancyId
      ORDER BY Priority ASC, IsRequired DESC
    `
    const requirements = await executeQuery<Requirement>(requirementsQuery, { vacancyId })

    // Try to fetch cached matching results from database
    const cachedMatchesQuery = `
      SELECT 
        m.UserId,
        m.OverallScore,
        m.MatchedRequirements,
        m.MissingRequirements,
        m.Reasoning,
        m.RequirementBreakdown,
        m.LastEvaluatedAt,
        u.Name,
        u.Email,
        u.Location
      FROM MatchingResults m
      INNER JOIN Users u ON m.UserId = u.Id
      WHERE m.AssignmentId = @vacancyId AND m.OverallScore IS NOT NULL
      ORDER BY m.OverallScore DESC
    `
    
    const cachedMatches = await executeQuery<any>(cachedMatchesQuery, { vacancyId })

    if (cachedMatches.length > 0) {
      // Return cached results
      console.log(`Returning ${cachedMatches.length} cached matches for vacancy ${vacancyId}`)
      
      const candidates: EvaluatedCandidate[] = cachedMatches.slice(0, 10).map((match) => ({
        userId: match.UserId.toString(),
        name: match.Name || 'Unknown',
        email: match.Email,
        location: match.Location,
        overallScore: match.OverallScore || 0,
        matchedRequirements: match.MatchedRequirements ? JSON.parse(match.MatchedRequirements) : [],
        missingRequirements: match.MissingRequirements ? JSON.parse(match.MissingRequirements) : [],
        reasoning: match.Reasoning || '',
        requirementBreakdown: match.RequirementBreakdown ? JSON.parse(match.RequirementBreakdown) : [],
      }))

      return NextResponse.json({
        success: true,
        vacancy: {
          ...vacancy,
          requirements: requirements,
        },
        candidates: candidates,
        searchQuery: 'Cached results',
        lastEvaluatedAt: cachedMatches[0].LastEvaluatedAt,
        cached: true,
      })
    }

    // If no cached results, fall back to live matching
    console.log(`No cached results found for vacancy ${vacancyId}, performing live matching...`)

    // Check if search is configured
    if (!searchEndpoint || !searchKey || !openaiKey || !openaiResource) {
      return NextResponse.json(
        { 
          error: 'No cached matches available and search service not configured',
          message: 'Matches are being computed in the background. Please refresh in a few moments.'
        },
        { status: 503 }
      )
    }

    // Build search query from vacancy and requirements
    const searchText = buildSearchQuery(vacancy, requirements)

    // Generate embedding for the search query
    const openaiClient = new AzureOpenAI({
      apiKey: openaiKey,
      endpoint: `https://${openaiResource}.openai.azure.com`,
      apiVersion: '2024-02-01',
    })

    const embeddingResponse = await openaiClient.embeddings.create({
      model: embeddingDeployment,
      input: searchText,
    })

    const queryVector = embeddingResponse.data[0].embedding

    // Search Azure AI Search with hybrid approach (vector + keyword)
    const searchClient = new SearchClient(
      searchEndpoint,
      indexName,
      new AzureKeyCredential(searchKey)
    )

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
    })

    // Collect search results
    const candidates: Candidate[] = []
    for await (const result of searchResults.results) {
      candidates.push({
        score: result.score,
        ...result.document,
      } as Candidate)
    }

    console.log(`Found ${candidates.length} candidates from vector search, evaluating with LLM...`)

    // Evaluate all candidates in parallel for better performance
    const evaluationPromises = candidates.map(candidate => 
      evaluateCandidateWithLLM(candidate, requirements, openaiClient)
    )
    
    const evaluatedCandidates = await Promise.all(evaluationPromises)

    // Sort by LLM score (descending) and take top 10
    evaluatedCandidates.sort((a, b) => b.overallScore - a.overallScore)
    const topCandidates = evaluatedCandidates.slice(0, 10)

    console.log(`Evaluated ${evaluatedCandidates.length} candidates in parallel, returning top ${topCandidates.length}`)

    return NextResponse.json({
      success: true,
      vacancy: {
        ...vacancy,
        requirements: requirements,
      },
      candidates: topCandidates,
      searchQuery: searchText,
    })
  } catch (error) {
    console.error('Vacancy matching error:', error)
    return NextResponse.json(
      { error: 'Failed to find matching candidates' },
      { status: 500 }
    )
  }
}

function buildSearchQuery(vacancy: Vacancy, requirements: Requirement[]): string {
  const parts: string[] = []

  // Add vacancy title and description
  if (vacancy.Title) {
    parts.push(`Job Title: ${vacancy.Title}`)
  }

  if (vacancy.Description) {
    parts.push(`Description: ${vacancy.Description}`)
  }

  if (vacancy.Client) {
    parts.push(`Client: ${vacancy.Client}`)
  }

  // Group requirements by type
  const requirementsByType = requirements.reduce((acc, req) => {
    if (!acc[req.RequirementType]) {
      acc[req.RequirementType] = []
    }
    acc[req.RequirementType].push(req.RequirementValue)
    return acc
  }, {} as Record<string, string[]>)

  // Add grouped requirements
  Object.entries(requirementsByType).forEach(([type, values]) => {
    parts.push(`${type}: ${values.join(', ')}`)
  })

  return parts.join('\n')
}

