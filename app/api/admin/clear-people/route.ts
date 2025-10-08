import { NextResponse } from 'next/server';
import { executeNonQuery } from '@/lib/database';
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';

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
    const searchClient = new SearchClient(
      searchEndpoint,
      indexName,
      new AzureKeyCredential(searchKey)
    )

    // Get all documents in the index
    const searchResults = await searchClient.search('*', {
      select: ['userId'],
      top: 1000, // Adjust if you have more than 1000 candidates
    })

    const documentsToDelete = []
    for await (const result of searchResults.results) {
      documentsToDelete.push({ userId: (result.document as any).userId })
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
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    let deletedIndexDocuments = 0;

    // Clear Azure AI Search index first
    try {
      deletedIndexDocuments = await clearSearchIndex();
    } catch (searchError) {
      console.error('Error clearing search index:', searchError);
      // Continue even if search index clearing fails
    }

    // Delete all related data in correct order (respecting foreign keys)
    await executeNonQuery('DELETE FROM UserDynamicFields', {});
    await executeNonQuery('DELETE FROM CVFiles', {});
    await executeNonQuery('DELETE FROM Technologies', {});
    await executeNonQuery('DELETE FROM Projects', {});
    await executeNonQuery('DELETE FROM Users', {});

    return NextResponse.json({ 
      success: true,
      deletedIndexDocuments,
      message: `All people and related data cleared successfully. Removed ${deletedIndexDocuments} documents from search index.`
    });
  } catch (error) {
    console.error('Error clearing people:', error);
    return NextResponse.json(
      { error: 'Failed to clear people data' },
      { status: 500 }
    );
  }
}

