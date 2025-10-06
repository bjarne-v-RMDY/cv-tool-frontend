import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, executeNonQuery } from '@/lib/database'

interface ActivityLogEntry {
  id: number
  type: 'upload' | 'processing' | 'completed' | 'error' | 'matching'
  title: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  userId?: number
  fileName?: string
  metadata?: string
  createdAt: string
  updatedAt: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, title, description, status, userId, fileName, metadata } = body

    const query = `
      INSERT INTO ActivityLog (Type, Title, Description, Status, UserId, FileName, Metadata)
      OUTPUT INSERTED.Id, INSERTED.CreatedAt, INSERTED.UpdatedAt
      VALUES (@type, @title, @description, @status, @userId, @fileName, @metadata)
    `

    const result = await executeQuery<{
      Id: number
      CreatedAt: string
      UpdatedAt: string
    }>(query, {
      type,
      title,
      description,
      status,
      userId: userId || null,
      fileName: fileName || null,
      metadata: metadata ? JSON.stringify(metadata) : null
    })

    const newEntry: ActivityLogEntry = {
      id: result[0].Id,
      type,
      title,
      description,
      status,
      userId: userId || undefined,
      fileName: fileName || undefined,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      createdAt: result[0].CreatedAt,
      updatedAt: result[0].UpdatedAt
    }

    return NextResponse.json({ success: true, entry: newEntry })
  } catch (error) {
    console.error('Activity log API error:', error)
    return NextResponse.json(
      { error: 'Failed to add activity log entry' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) as total FROM ActivityLog'
    const countResult = await executeQuery<{ total: number }>(countQuery)
    const total = countResult[0].total

    // Get paginated activities
    const activitiesQuery = `
      SELECT Id, Type, Title, Description, Status, UserId, FileName, Metadata, CreatedAt, UpdatedAt
      FROM ActivityLog
      ORDER BY CreatedAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `

    const activities = await executeQuery<ActivityLogEntry>(activitiesQuery, {
      offset,
      limit
    })

    return NextResponse.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Activity log API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity log' },
      { status: 500 }
    )
  }
}
