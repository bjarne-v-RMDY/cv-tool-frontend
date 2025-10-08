import { NextResponse } from 'next/server'
import { executeQuery, executeNonQuery } from '@/lib/database'
import { BlobServiceClient } from '@azure/storage-blob'

// Helper function to get BlobServiceClient
function getBlobServiceClient() {
  const connectionString = process.env.azure_storage_connection_string
  if (!connectionString) {
    throw new Error('Azure Storage connection string is not configured')
  }
  return BlobServiceClient.fromConnectionString(connectionString)
}

export async function DELETE() {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Admin functions are disabled in production' },
        { status: 403 }
      )
    }

    const CONTAINER_NAME = 'cv-files'
    let deletedFiles = 0
    let deletedRecords = 0

    // Get all CV files from storage
    try {
      const blobServiceClient = getBlobServiceClient()
      const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)
      
      // List all blobs in the container
      const blobs = containerClient.listBlobsFlat()
      
      // Delete each blob
      for await (const blob of blobs) {
        try {
          await containerClient.deleteBlob(blob.name)
          deletedFiles++
          console.log(`Deleted blob: ${blob.name}`)
        } catch (blobError) {
          console.error(`Failed to delete blob ${blob.name}:`, blobError)
        }
      }
    } catch (storageError) {
      console.error('Error accessing Azure Storage:', storageError)
      // Continue with database cleanup even if storage fails
    }

    // Clear CV-related database records
    try {
      // Get count of records before deletion
      const countQuery = 'SELECT COUNT(*) as total FROM CVFiles'
      const countResult = await executeQuery<{ total: number }>(countQuery)
      deletedRecords = countResult[0]?.total || 0

      // Delete CV files records (if table exists)
      try {
        await executeNonQuery('DELETE FROM CVFiles')
      } catch (tableError) {
        console.log('CVFiles table might not exist, skipping...')
      }

      // Clear related activity logs
      await executeNonQuery("DELETE FROM ActivityLog WHERE Type IN ('upload', 'processing', 'completed')")
      
    } catch (dbError) {
      console.error('Error clearing database records:', dbError)
    }

    return NextResponse.json({
      success: true,
      deletedFiles,
      deletedRecords,
      message: `Removed ${deletedFiles} files from storage and ${deletedRecords} database records`
    })
  } catch (error) {
    console.error('Error removing CVs:', error)
    return NextResponse.json(
      { error: 'Failed to remove CVs' },
      { status: 500 }
    )
  }
}
