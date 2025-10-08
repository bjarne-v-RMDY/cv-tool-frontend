import { NextResponse } from 'next/server';
import { QueueServiceClient } from '@azure/storage-queue';
import { executeQuery } from '@/lib/database';

export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    // Get all user IDs from database
    const users = await executeQuery('SELECT Id FROM Users WHERE Id IS NOT NULL', {}) as Array<{ Id: number }>;

    if (users.length === 0) {
      return NextResponse.json({ count: 0, message: 'No users to index' });
    }

    // Get queue client
    const queueServiceClient = QueueServiceClient.fromConnectionString(
      process.env.azure_storage_connection_string!
    );
    const queueClient = queueServiceClient.getQueueClient('cv-indexing-queue');
    await queueClient.createIfNotExists();

    // Queue all users for indexing
    const queuePromises = users.map(user =>
      queueClient.sendMessage(
        Buffer.from(JSON.stringify({ userId: user.Id })).toString('base64')
      )
    );

    await Promise.all(queuePromises);

    // Mark all users as not indexed so they'll be re-indexed
    await executeQuery('UPDATE Users SET IsIndexed = 0, LastIndexedAt = NULL', {});

    return NextResponse.json({
      success: true,
      count: users.length,
      message: `Queued ${users.length} candidates for re-indexing`,
      clearChat: true, // Signal to client to clear chat history
    });
  } catch (error) {
    console.error('Error queueing for reindex:', error);
    return NextResponse.json(
      { error: 'Failed to queue candidates for re-indexing' },
      { status: 500 }
    );
  }
}

