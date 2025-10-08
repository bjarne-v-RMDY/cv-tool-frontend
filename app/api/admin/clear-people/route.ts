import { NextResponse } from 'next/server';
import { executeNonQuery } from '@/lib/database';

export async function DELETE() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    // Delete all related data in correct order (respecting foreign keys)
    await executeNonQuery('DELETE FROM UserDynamicFields', {});
    await executeNonQuery('DELETE FROM CVFiles', {});
    await executeNonQuery('DELETE FROM Technologies', {});
    await executeNonQuery('DELETE FROM Projects', {});
    await executeNonQuery('DELETE FROM Users', {});

    return NextResponse.json({ 
      success: true,
      message: 'All people and related data cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing people:', error);
    return NextResponse.json(
      { error: 'Failed to clear people data' },
      { status: 500 }
    );
  }
}

