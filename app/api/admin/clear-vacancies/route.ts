import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { BlobServiceClient } from '@azure/storage-blob'

export async function DELETE() {
  try {
    // Delete from database (cascade will handle AssignmentRequirements and AssignmentFiles)
    const deleteResult = await executeQuery(
      'DELETE FROM ProjectAssignments',
      {}
    )

    // Delete files from Azure Blob Storage
    let deletedFiles = 0
    try {
      const connectionString = process.env.azure_storage_connection_string
      if (connectionString) {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
        const containerClient = blobServiceClient.getContainerClient('vacancy-files')
        
        // Check if container exists
        const containerExists = await containerClient.exists()
        
        if (containerExists) {
          // List and delete all blobs
          for await (const blob of containerClient.listBlobsFlat()) {
            await containerClient.deleteBlob(blob.name)
            deletedFiles++
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
          title: 'Vacancies Cleared',
          description: 'All vacancies and requirements cleared from database',
          status: 'completed',
          metadata: {
            deletedFiles,
            action: 'clear-vacancies'
          }
        })
      })
    } catch (logError) {
      console.error('Failed to log activity:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'All vacancies cleared successfully',
      deletedFiles,
    })
  } catch (error) {
    console.error('Error clearing vacancies:', error)
    return NextResponse.json(
      { error: 'Failed to clear vacancies' },
      { status: 500 }
    )
  }
}

