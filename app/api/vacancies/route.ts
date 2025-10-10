import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

interface Vacancy {
  Id: number
  Title: string
  Client: string | null
  Description: string | null
  Location: string | null
  Duration: string | null
  RemoteWork: boolean
  StartDate: string | null
  Budget: string | null
  CreatedAt: string
}

interface RequirementCount {
  AssignmentId: number
  Count: number
}

export async function GET() {
  try {
    // Fetch all vacancies
    const vacanciesQuery = `
      SELECT 
        pa.Id,
        pa.Title,
        pa.Client,
        pa.Description,
        pa.Location,
        pa.Duration,
        pa.RemoteWork,
        pa.StartDate,
        pa.Budget,
        pa.CreatedAt
      FROM ProjectAssignments pa
      ORDER BY pa.CreatedAt DESC
    `
    
    const vacancies = await executeQuery<Vacancy>(vacanciesQuery)

    // Fetch requirements count for each vacancy
    const requirementsQuery = `
      SELECT 
        AssignmentId,
        COUNT(*) as Count
      FROM AssignmentRequirements
      GROUP BY AssignmentId
    `
    
    const requirementCounts = await executeQuery<RequirementCount>(requirementsQuery)

    // Map requirements counts to vacancies
    const requirementsMap = new Map(
      requirementCounts.map(r => [r.AssignmentId, r.Count])
    )

    const enrichedVacancies = vacancies.map(vacancy => ({
      ...vacancy,
      RequirementsCount: requirementsMap.get(vacancy.Id) || 0
    }))

    return NextResponse.json({
      success: true,
      vacancies: enrichedVacancies
    })

  } catch (error) {
    console.error('Vacancies API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vacancies' },
      { status: 500 }
    )
  }
}

