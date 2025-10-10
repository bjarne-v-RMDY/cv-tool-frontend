import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

interface Project {
  Id: number
  Title: string
  Company: string
  Role: string | null
  Description: string | null
  StartDate: string | null
  EndDate: string | null
  IsCurrentJob: boolean
}

interface Technology {
  Technology: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      )
    }

    // Fetch projects for the user
    const projectsQuery = `
      SELECT 
        p.Id,
        p.Title,
        p.Company,
        p.Role,
        p.Description,
        p.StartDate,
        p.EndDate,
        p.IsCurrentJob
      FROM Projects p
      WHERE p.UserId = @userId
      ORDER BY 
        CASE WHEN p.EndDate IS NULL THEN 0 ELSE 1 END,
        p.StartDate DESC
    `
    
    const projects = await executeQuery<Project>(projectsQuery, { userId: parseInt(userId) })

    // Fetch technologies for each project
    const projectsWithTech = await Promise.all(
      projects.map(async (project) => {
        const techQuery = `
          SELECT Technology
          FROM Technologies
          WHERE ProjectId = @projectId
          ORDER BY Technology
        `
        const technologies = await executeQuery<Technology>(
          techQuery,
          { projectId: project.Id }
        )
        
        return {
          ...project,
          Technologies: technologies.map(t => t.Technology)
        }
      })
    )

    return NextResponse.json({
      success: true,
      projects: projectsWithTech
    })

  } catch (error) {
    console.error('Projects API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

