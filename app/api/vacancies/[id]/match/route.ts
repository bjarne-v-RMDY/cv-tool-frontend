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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vacancyId = parseInt(params.id)

    if (isNaN(vacancyId)) {
      return NextResponse.json({ error: 'Invalid vacancy ID' }, { status: 400 })
    }

    // Check if search is configured
    if (!searchEndpoint || !searchKey || !openaiKey || !openaiResource) {
      return NextResponse.json(
        { error: 'Search service not configured' },
        { status: 503 }
      )
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

    return NextResponse.json({
      success: true,
      vacancy: {
        ...vacancy,
        requirements: requirements,
      },
      candidates: candidates,
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

