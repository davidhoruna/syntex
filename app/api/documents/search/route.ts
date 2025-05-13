import { NextRequest, NextResponse } from 'next/server';
import { searchDocuments } from '@/lib/langchain-utils';
import { auth } from '@/lib/auth';

/**
 * API route to search documents using vector similarity
 * 
 * POST /api/documents/search
 * body: { query: string, limit?: number, filters?: Record<string, any> }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the search query from the request
    const { query, limit = 5, filters = {} } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'No search query provided or invalid format' },
        { status: 400 }
      );
    }
    
    // Add user_id to filters to ensure users only see their documents
    const searchFilters = {
      ...filters,
      user_id: session.user.id
    };
    
    // Search documents
    const results = await searchDocuments(query, limit, searchFilters);
    
    // Return the search results
    return NextResponse.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search documents',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 