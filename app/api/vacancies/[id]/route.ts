import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, executeNonQuery } from '@/lib/database'
import { BlobServiceClient } from '@azure/storage-blob'

interface Vacancy {
  Id: number
  Title: string
  Client: string | null
}

interface AssignmentFile {
  FilePath: string
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const vacancyId = parseInt(params.id)

    if (isNaN(vacancyId)) {
      return NextResponse.json({ error: 'Invalid vacancy ID' }, { status: 400 })
    }

    // Fetch vacancy details before deletion
    const vacancyQuery = `
      SELECT Id, Title, Client
      FROM ProjectAssignments
      WHERE Id = @vacancyId
    `
    const vacancies = await executeQuery<Vacancy>(vacancyQuery, { vacancyId })

    if (vacancies.length === 0) {
      return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 })
    }

    const vacancy = vacancies[0]

    // Fetch file paths before deletion
    const filesQuery = `
      SELECT FilePath
      FROM AssignmentFiles
      WHERE AssignmentId = @vacancyId
    `
    const files = await executeQuery<AssignmentFile>(filesQuery, { vacancyId })

    // Delete from database (CASCADE will handle AssignmentRequirements, AssignmentFiles, and MatchingResults)
    await executeNonQuery(
      'DELETE FROM ProjectAssignments WHERE Id = @vacancyId',
      { vacancyId }
    )

    // Delete files from Azure Blob Storage
    let deletedFiles = 0
    try {
      const connectionString = process.env.azure_storage_connection_string
      if (connectionString && files.length > 0) {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
        const containerClient = blobServiceClient.getContainerClient('vacancy-files')
        
        const containerExists = await containerClient.exists()
        
        if (containerExists) {
          for (const file of files) {
            try {
              // Extract blob name from FilePath (format: vacancy-files/filename)
              const blobName = file.FilePath.replace('vacancy-files/', '')
              await containerClient.deleteBlob(blobName)
              deletedFiles++
            } catch (blobError) {
              console.error(`Error deleting blob ${file.FilePath}:`, blobError)
              // Continue with other files even if one fails
            }
          }
        }
      }
    } catch (storageError) {
      console.error('Error deleting vacancy files from storage:', storageError)
      // Continue even if storage deletion fails
    }

    // Log activity
    try {
      await fetch(`${process.env.next_public_base_url || 'http://localhost:3000'}/api/activity-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'admin',
          title: 'Vacancy Deleted',
          description: `Vacancy "${vacancy.Title}" deleted${vacancy.Client ? ` (${vacancy.Client})` : ''}`,
          status: 'completed',
          metadata: {
            vacancyId: vacancy.Id,
            vacancyTitle: vacancy.Title,
            deletedFiles,
            action: 'delete-vacancy'
          }
        })
      })
    } catch (logError) {
      console.error('Failed to log activity:', logError)
    }

    return NextResponse.json({
      success: true,
      message: `Vacancy "${vacancy.Title}" deleted successfully`,
      deletedFiles,
    })
  } catch (error) {
    console.error('Error deleting vacancy:', error)
    return NextResponse.json(
      { error: 'Failed to delete vacancy' },
      { status: 500 }
    )
  }
}


