import { NextRequest, NextResponse } from 'next/server'

interface ActivityLogEntry {
  id: string
  type: 'upload' | 'processing' | 'completed' | 'error' | 'matching'
  title: string
  description: string
  timestamp: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  userId?: string
  fileName?: string
}

// In-memory storage for demo purposes
// In production, this would be stored in a database
let activityLog: ActivityLogEntry[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, title, description, status, userId, fileName } = body

    const newEntry: ActivityLogEntry = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      description,
      timestamp: new Date().toISOString(),
      status,
      userId,
      fileName
    }

    activityLog.unshift(newEntry) // Add to beginning
    activityLog = activityLog.slice(0, 100) // Keep only last 100 entries

    return NextResponse.json({ success: true, entry: newEntry })
  } catch (error) {
    console.error('Activity log API error:', error)
    return NextResponse.json(
      { error: 'Failed to add activity log entry' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    return NextResponse.json({ activities: activityLog })
  } catch (error) {
    console.error('Activity log API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity log' },
      { status: 500 }
    )
  }
}
