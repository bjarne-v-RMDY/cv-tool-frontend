import { NextRequest, NextResponse } from 'next/server'
import { BlobServiceClient } from '@azure/storage-blob'
import { QueueServiceClient } from '@azure/storage-queue'
import { v4 as uuidv4 } from 'uuid'

// Azure Storage configuration
const CONTAINER_NAME = 'project-files'
const QUEUE_NAME = 'project-processing-queue'

// Helper function to get BlobServiceClient
function getBlobServiceClient() {
  const connectionString = process.env.azure_storage_connection_string
  if (!connectionString) {
    throw new Error('Azure Storage connection string is not configured')
  }
  return BlobServiceClient.fromConnectionString(connectionString)
}

// Helper function to get QueueServiceClient
function getQueueServiceClient() {
  const connectionString = process.env.azure_storage_connection_string
  if (!connectionString) {
    throw new Error('Azure Storage connection string is not configured')
  }
  return QueueServiceClient.fromConnectionString(connectionString)
}

// File validation
const ALLOWED_FILE_TYPES = ['application/pdf', 'text/plain']
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only PDF and TXT files are allowed' }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size must be less than 100MB' }
  }

  // Check file name
  if (!file.name || file.name.trim() === '') {
    return { valid: false, error: 'File must have a valid name' }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const userId = formData.get('userId') as string

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const uploadResults = []
    const errors = []

    // Ensure container and queue exist
    try {
      const blobServiceClient = getBlobServiceClient()
      const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)
      await containerClient.createIfNotExists()

      const queueServiceClient = getQueueServiceClient()
      const queueClient = queueServiceClient.getQueueClient(QUEUE_NAME)
      await queueClient.createIfNotExists()
    } catch (initError) {
      console.error('Failed to initialize Azure resources:', initError)
    }

    for (const file of files) {
      // Validate file
      const validation = validateFile(file)
      if (!validation.valid) {
        errors.push({
          fileName: file.name,
          error: validation.error
        })
        continue
      }

      try {
        // Generate unique filename
        const fileExtension = file.name.split('.').pop()
        const uniqueFileName = `${uuidv4()}.${fileExtension}`
        
        // Upload to Azure Storage
        const blobServiceClient = getBlobServiceClient()
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)
        const blockBlobClient = containerClient.getBlockBlobClient(uniqueFileName)
        
        const fileBuffer = await file.arrayBuffer()
        const uploadResponse = await blockBlobClient.upload(fileBuffer, fileBuffer.byteLength, {
          blobHTTPHeaders: {
            blobContentType: file.type,
          },
          metadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            fileSize: file.size.toString(),
            userId: userId
          }
        })

        uploadResults.push({
          fileName: file.name,
          uniqueFileName,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          etag: uploadResponse.etag
        })

        // Log upload completion to activity log
        try {
          await fetch(`${process.env.next_public_base_url || 'http://localhost:3000'}/api/activity-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'upload',
              title: 'Project File Uploaded',
              description: `${file.name} uploaded for user ID ${userId}`,
              status: 'completed',
              fileName: file.name,
              metadata: {
                uniqueFileName,
                userId,
                fileSize: file.size,
                fileType: file.type,
                storageUrl: blockBlobClient.url
              }
            })
          })
        } catch (logError) {
          console.error('Failed to log upload activity:', logError)
        }

        // Add message to processing queue
        try {
          const queueServiceClient = getQueueServiceClient()
          const queueClient = queueServiceClient.getQueueClient(QUEUE_NAME)
          
          const queueMessage = {
            fileName: file.name,
            uniqueFileName,
            blobUrl: blockBlobClient.url,
            userId: parseInt(userId),
            fileSize: file.size,
            fileType: file.type,
            uploadedAt: new Date().toISOString(),
            messageId: uuidv4()
          }

          await queueClient.sendMessage(Buffer.from(JSON.stringify(queueMessage)).toString('base64'))
          console.log(`Added to project processing queue: ${file.name} for user ${userId}`)

          // Log queue operation to activity log
          await fetch(`${process.env.next_public_base_url || 'http://localhost:3000'}/api/activity-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'processing',
              title: 'Project File Queued for Processing',
              description: `${file.name} added to processing queue for user ID ${userId}`,
              status: 'pending',
              fileName: file.name,
              metadata: {
                queueName: QUEUE_NAME,
                messageId: queueMessage.messageId,
                userId
              }
            })
          })
        } catch (queueError) {
          console.error('Failed to add to queue:', queueError)
          // Continue even if queue fails - file is still uploaded
        }

      } catch (uploadError) {
        console.error(`Error uploading file ${file.name}:`, uploadError)
        errors.push({
          fileName: file.name,
          error: 'Failed to upload file to storage'
        })

        // Add error to activity log
        try {
          await fetch(`${process.env.next_public_base_url || 'http://localhost:3000'}/api/activity-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'error',
              title: 'Project Upload Error',
              description: `Failed to upload ${file.name} for user ID ${userId}`,
              status: 'failed',
              fileName: file.name,
              metadata: {
                error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
                userId,
                fileSize: file.size,
                fileType: file.type
              }
            })
          })
        } catch (logError) {
          console.error('Failed to log error activity:', logError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      uploadedFiles: uploadResults,
      errors: errors,
      totalUploaded: uploadResults.length,
      totalErrors: errors.length
    })

  } catch (error) {
    console.error('Project upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

