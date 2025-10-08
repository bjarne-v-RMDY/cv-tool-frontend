import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

interface Person {
  Id: number
  Name: string
  Email: string
  Phone: string | null
  Location: string | null
  LinkedInProfile: string | null
  CreatedAt: string
  UpdatedAt: string
  Projects: Array<{
    Id: number
    Title: string
    Company: string
    Role: string | null
    Description: string | null
    Technologies: string[]
  }>
  DynamicFields: Record<string, string>
}

export async function GET() {
  try {
    // Fetch all users with their projects and technologies
    const usersQuery = `
      SELECT 
        u.Id,
        u.Name,
        u.Email,
        u.Phone,
        u.Location,
        u.LinkedInProfile,
        u.CreatedAt,
        u.UpdatedAt
      FROM Users u
      ORDER BY u.CreatedAt DESC
    `
    
    const users = await executeQuery<Person>(usersQuery)

    // Fetch projects and technologies for each user
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        // Get projects
        const projectsQuery = `
          SELECT 
            p.Id,
            p.Title,
            p.Company,
            p.Role,
            p.Description
          FROM Projects p
          WHERE p.UserId = @userId
          ORDER BY p.CreatedAt DESC
        `
        const projects = await executeQuery<{
          Id: number
          Title: string
          Company: string
          Role: string | null
          Description: string | null
        }>(projectsQuery, { userId: user.Id })

        // Get technologies for each project
        const projectsWithTech = await Promise.all(
          projects.map(async (project) => {
            const techQuery = `
              SELECT Technology
              FROM Technologies
              WHERE ProjectId = @projectId
            `
            const technologies = await executeQuery<{ Technology: string }>(
              techQuery,
              { projectId: project.Id }
            )
            
            return {
              ...project,
              Technologies: technologies.map(t => t.Technology)
            }
          })
        )

        // Get dynamic fields
        const dynamicFieldsQuery = `
          SELECT 
            df.FieldName,
            udf.FieldValue
          FROM UserDynamicFields udf
          JOIN DynamicSchemaFields df ON udf.FieldId = df.Id
          WHERE udf.UserId = @userId
        `
        const dynamicFields = await executeQuery<{
          FieldName: string
          FieldValue: string
        }>(dynamicFieldsQuery, { userId: user.Id })

        const dynamicFieldsMap: Record<string, string> = {}
        dynamicFields.forEach(field => {
          dynamicFieldsMap[field.FieldName] = field.FieldValue
        })

        return {
          ...user,
          Projects: projectsWithTech,
          DynamicFields: dynamicFieldsMap
        }
      })
    )

    return NextResponse.json({
      success: true,
      people: enrichedUsers,
      total: enrichedUsers.length
    })
  } catch (error) {
    console.error('Error fetching people:', error)
    return NextResponse.json(
      { error: 'Failed to fetch people data' },
      { status: 500 }
    )
  }
}

