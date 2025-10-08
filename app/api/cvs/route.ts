import { NextRequest, NextResponse } from 'next/server'
import { BlobServiceClient } from '@azure/storage-blob'

const CONTAINER_NAME = 'cv-files'

function getBlobServiceClient() {
  const connectionString = process.env.azure_storage_connection_string
  if (!connectionString) {
    throw new Error('Azure Storage connection string is not configured')
  }
  return BlobServiceClient.fromConnectionString(connectionString)
}

export async function GET(request: NextRequest) {
  try {
    const blobServiceClient = getBlobServiceClient()
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)

    const cvFiles = []

    // List all blobs in the container
    for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
      cvFiles.push({
        name: blob.metadata?.originalName || blob.name,
        uniqueName: blob.name,
        size: blob.properties.contentLength,
        uploadedAt: blob.properties.createdOn,
        contentType: blob.properties.contentType,
        url: `${containerClient.url}/${blob.name}`,
        metadata: blob.metadata
      })
    }

    // Sort by upload date (newest first)
    cvFiles.sort((a, b) => {
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      files: cvFiles,
      total: cvFiles.length
    })

  } catch (error) {
    console.error('Fetch CVs API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch CV files' },
      { status: 500 }
    )
  }
}
