import { NextResponse } from 'next/server';
import { executeNonQuery } from '@/lib/database';
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';

interface SearchDocument {
  userId: string
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
    let deletedIndexDocuments = 0;

    // Clear Azure AI Search index first
    try {
      deletedIndexDocuments = await clearSearchIndex();
    } catch (searchError) {
      console.error('Error clearing search index:', searchError);
      // Continue even if search index clearing fails
    }

    // Delete all related data in correct order (respecting foreign keys)
    // First delete Slack-related tables that reference Users
    await executeNonQuery('DELETE FROM TempUploadLinks', {});
    await executeNonQuery('DELETE FROM SlackUsers', {});
    
    // Then delete user-related data
    await executeNonQuery('DELETE FROM UserDynamicFields', {});
    await executeNonQuery('DELETE FROM CVFiles', {});
    await executeNonQuery('DELETE FROM Technologies', {});
    await executeNonQuery('DELETE FROM Projects', {});
    
    // Finally delete users
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

