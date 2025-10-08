import { NextResponse } from 'next/server';

export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    // Since chat history is stored in localStorage on the client side,
    // this endpoint will return success and the client will handle clearing
    return NextResponse.json({
      success: true,
      message: 'Chat history cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat history' },
      { status: 500 }
    );
  }
}
