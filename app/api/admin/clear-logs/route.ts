import { NextResponse } from 'next/server'
import { executeNonQuery } from '@/lib/database'

export async function DELETE() {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Admin functions are disabled in production' },
        { status: 403 }
      )
    }

    // Get count before deletion
    const countQuery = 'SELECT COUNT(*) as total FROM ActivityLog'
    const countResult = await executeNonQuery(countQuery)
    
    // Clear all activity logs
    const deleteQuery = 'DELETE FROM ActivityLog'
    await executeNonQuery(deleteQuery)

    return NextResponse.json({
      success: true,
      deletedCount: countResult.recordset?.[0]?.total || 0,
      message: 'All activity logs cleared successfully'
    })
  } catch (error) {
    console.error('Error clearing activity logs:', error)
    return NextResponse.json(
      { error: 'Failed to clear activity logs' },
      { status: 500 }
    )
  }
}
