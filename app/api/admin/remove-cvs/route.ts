import { NextResponse } from 'next/server'
import { executeQuery, executeNonQuery } from '@/lib/database'
import { BlobServiceClient } from '@azure/storage-blob'
import { SearchClient, AzureKeyCredential } from '@azure/search-documents'

interface SearchDocument {
  userId: string
}

// Helper function to get BlobServiceClient
function getBlobServiceClient() {
  const connectionString = process.env.azure_storage_connection_string
  if (!connectionString) {
    throw new Error('Azure Storage connection string is not configured')
  }
  return BlobServiceClient.fromConnectionString(connectionString)
}

// Helper function to clear Azure AI Search index
async function clearSearchIndex() {
  const searchEndpoint = process.env.azure_search_endpoint
  const searchKey = process.env.azure_search_key
  const indexName = 'cv-candidates'

  if (!searchEndpoint || !searchKey) {
    console.warn('Azure Search not configured, skipping index clearing')
    return 0
  }

  try {
    const searchClient = new SearchClient<SearchDocument>(
      searchEndpoint,
      indexName,
      new AzureKeyCredential(searchKey)
    )

    // Get all documents in the index
    const searchResults = await searchClient.search('*', {
      select: ['userId'],
      top: 1000, // Adjust if you have more than 1000 candidates
    })

    const documentsToDelete: { userId: string }[] = []
    for await (const result of searchResults.results) {
      if (result.document?.userId) {
        documentsToDelete.push({ userId: result.document.userId })
      }
    }

    if (documentsToDelete.length > 0) {
      // Delete all documents from the index
      await searchClient.deleteDocuments(documentsToDelete)
      console.log(`Deleted ${documentsToDelete.length} documents from search index`)
      return documentsToDelete.length
    }

    return 0
  } catch (error) {
    console.error('Error clearing search index:', error)
    throw error
  }
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
    let deletedIndexDocuments = 0

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

    // Clear Azure AI Search index
    try {
      deletedIndexDocuments = await clearSearchIndex()
    } catch (searchError) {
      console.error('Error clearing search index:', searchError)
      // Continue even if search index clearing fails
    }

    return NextResponse.json({
      success: true,
      deletedFiles,
      deletedRecords,
      deletedIndexDocuments,
      message: `Removed ${deletedFiles} files from storage, ${deletedRecords} database records, and ${deletedIndexDocuments} search index documents`
    })
  } catch (error) {
    console.error('Error removing CVs:', error)
    return NextResponse.json(
      { error: 'Failed to remove CVs' },
      { status: 500 }
    )
  }
}
