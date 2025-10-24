import { NextRequest, NextResponse } from 'next/server'
import { executeNonQuery, executeQuery } from '@/lib/database'
import { QueueServiceClient } from '@azure/storage-queue'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const vacancyId = parseInt(params.id)

    if (isNaN(vacancyId)) {
      return NextResponse.json({ error: 'Invalid vacancy ID' }, { status: 400 })
    }

    // Check if vacancy exists
    const vacancyQuery = `
      SELECT Id, Title FROM ProjectAssignments WHERE Id = @vacancyId
    `
    const vacancies = await executeQuery<{ Id: number; Title: string }>(
      vacancyQuery,
      { vacancyId }
    )

    if (vacancies.length === 0) {
      return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 })
    }

    const vacancy = vacancies[0]

    // Delete existing matches for this vacancy
    await executeNonQuery(
      'DELETE FROM MatchingResults WHERE AssignmentId = @vacancyId',
      { vacancyId }
    )

    // Queue matching job
    const storageConnection = process.env.azure_storage_connection_string
    if (!storageConnection) {
      return NextResponse.json(
        { error: 'Storage connection not configured' },
        { status: 500 }
      )
    }

    const queueServiceClient = QueueServiceClient.fromConnectionString(storageConnection)
    const queueClient = queueServiceClient.getQueueClient('vacancy-matching-queue')

    // Ensure queue exists
    await queueClient.createIfNotExists()

    // Add message to queue
    const message = JSON.stringify({ vacancyId })
    await queueClient.sendMessage(Buffer.from(message).toString('base64'))

    console.log(`Queued re-evaluation for vacancy ${vacancyId}: ${vacancy.Title}`)

    // Log activity
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/activity-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'matching',
          title: 'Vacancy Match Refresh Requested',
          description: `Re-evaluating candidates for vacancy "${vacancy.Title}"`,
          status: 'processing',
          metadata: {
            vacancyId,
            vacancyTitle: vacancy.Title,
          },
        }),
      })
    } catch (logError) {
      console.error('Error logging activity:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'Re-evaluation queued successfully',
      vacancyId,
      estimatedCompletionTime: '10-15 seconds',
    }, { status: 202 })
  } catch (error) {
    console.error('Error refreshing vacancy matches:', error)
    return NextResponse.json(
      { error: 'Failed to queue match refresh' },
      { status: 500 }
    )
  }
}

