import { NextResponse } from 'next/server';

export async function POST() {
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
