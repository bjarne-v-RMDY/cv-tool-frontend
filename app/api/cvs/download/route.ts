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
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('file')

    if (!fileName) {
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      )
    }

    const blobServiceClient = getBlobServiceClient()
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)
    const blockBlobClient = containerClient.getBlockBlobClient(fileName)

    // Check if blob exists
    const exists = await blockBlobClient.exists()
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Download the blob
    const downloadResponse = await blockBlobClient.download()
    const blob = await downloadResponse.blobBody

    if (!blob) {
      return NextResponse.json(
        { error: 'Failed to download file' },
        { status: 500 }
      )
    }

    // Get blob properties for metadata
    const properties = await blockBlobClient.getProperties()
    const originalName = properties.metadata?.originalName || fileName

    // Convert blob to buffer
    const buffer = await blob.arrayBuffer()

    // Return file as download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': properties.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${originalName}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    })

  } catch (error) {
    console.error('Download API error:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}
