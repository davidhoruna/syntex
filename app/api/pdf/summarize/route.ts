import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

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
    
    // Trim text if it's too long (OpenAI has token limits)
    const trimmedText = text.length > 15000 ? text.substring(0, 15000) + '...' : text
    
    // Generate prompt for the AI to create comprehensive summaries instead of flashcards
    const prompt = `
    You are an expert at summarizing complex documents, especially scientific papers.
    
    Create ${numSummaries} comprehensive summary sections from this PDF text content.
    Each section should cover a major topic or theme from the document.
    
    Instead of short flashcards, produce longer, more detailed summary paragraphs that:
    1. Synthesize key concepts, methodologies, findings, and conclusions
    2. Maintain academic language and technical terminology where appropriate
    3. Provide sufficient detail to understand complex ideas (aim for 100-150 words per section)
    4. Connect related ideas and maintain the logical flow of the original content
    
    Structure each summary section with a clear topic sentence followed by supporting details.
    Separate each summary section with two line breaks.
    
    TEXT FROM PDF:
    ${trimmedText}
    `
    
    // Generate summaries using the AI SDK with increased token limit for longer summaries
    const { text: summaryText } = await generateText({
      model: openai('gpt-4o'),
      prompt,
      temperature: 0.7,
      maxTokens: 2000, // Increased token limit for longer summaries
    })
    
    // Split the summary text into individual sections
    const summaries = summaryText
      .split('\n\n\n') // Use triple newlines to separate major sections
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, numSummaries)
    
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