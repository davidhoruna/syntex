import { NextRequest, NextResponse } from 'next/server'
import { generateSummariesWithLangChain } from '@/lib/langchain-utils'

/**
 * API route to generate summaries from PDF text
 * 
 * POST /api/pdf/summarize
 * body: { text: string, numSummaries?: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Get the text from the request
    const { text, numSummaries = 5 } = await request.json()
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'No text provided or invalid format' },
        { status: 400 }
      )
    }
    
    // Generate summaries using LangChain
    const summaries = await generateSummariesWithLangChain(text, numSummaries)
    
    // Return the summaries
    return NextResponse.json({
      success: true,
      summaries: summaries.length > 0 ? summaries : ['No comprehensive summary could be generated for this document.']
    })
  } catch (error) {
    console.error('Error generating summaries:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate summaries',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 