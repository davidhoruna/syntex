import { NextRequest, NextResponse } from 'next/server'
import { generateSummariesWithLangChain, generateEmbedding } from '@/lib/langchain-utils'
import { createClient } from '@supabase/supabase-js'

/**
 * API route to generate summaries from PDF text
 * 
 * POST /api/pdf/summarize
 * body: { text: string, numSummaries?: number, documentId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Get the text and document ID from the request
    const { text, numSummaries = 5, documentId } = await request.json()
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'No text provided or invalid format' },
        { status: 400 }
      )
    }
    
    console.log(`Generating ${numSummaries} summaries${documentId ? ` for document ${documentId}` : ''}`)
    
    // Generate summaries using LangChain
    const summaries = await generateSummariesWithLangChain(text, numSummaries)
    
    // If no summaries were generated, return error
    if (!summaries || summaries.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No summaries could be generated',
        summaries: ['No comprehensive summary could be generated for this document.']
      })
    }
    
    // If we have a document ID, save each summary to the database
    if (documentId) {
      console.log(`Saving ${summaries.length} summaries for document ${documentId} to database`)
      
      try {
        // Create a direct Supabase client for server-side usage
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://etltjlriajrbrqfxreet.supabase.co'
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        
        if (!supabaseServiceKey) {
          console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
          return NextResponse.json({
            success: true,
            summaries,
            warning: 'Summaries not saved to database - missing service role key'
          })
        }
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        // Clear any existing summaries for this document
        const { error: deleteError } = await supabase
          .from('summaries')
          .delete()
          .eq('document_id', documentId)
        
        if (deleteError) {
          console.error('Error deleting existing summaries:', deleteError)
        }
        
        // Generate embedding for the content (for future search)
        let embedding = null
        try {
          // Only use the first 1500 chars to avoid token limits
          const textForEmbedding = text.substring(0, 1500)
          embedding = await generateEmbedding(textForEmbedding)
        } catch (embeddingError) {
          console.error('Error generating embedding:', embeddingError)
          // Continue even if embedding fails
        }
        
        // First get the document to obtain the user_id (needed for the update)
        const { data: document, error: getDocError } = await supabase
          .from('documents')
          .select('user_id')
          .eq('id', documentId)
          .single()
          
        if (getDocError || !document) {
          console.error('Error getting document details:', getDocError)
          throw new Error(`Could not find document with ID ${documentId}`)
        }
        
        // Add content and metadata to the document
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            content: text.substring(0, 10000), // First 10K chars
            embedding: embedding,
            metadata: { 
              summaries_count: summaries.length,
              updated_at: new Date().toISOString() 
            }
          })
          .eq('id', documentId)
          .eq('user_id', document.user_id)
        
        if (updateError) {
          console.error('Error updating document with content and embedding:', updateError)
        }
        
        // Save each summary directly with Supabase
        for (const content of summaries) {
          const { error: insertError } = await supabase
            .from('summaries')
            .insert([{ document_id: documentId, content }])
            
          if (insertError) {
            console.error('Error saving summary:', insertError)
          }
        }
        
        console.log(`Successfully saved summaries to database for document ${documentId}`)
      } catch (dbError) {
        console.error('Error saving summaries to database:', dbError)
        return NextResponse.json({
          success: true,
          summaries,
          warning: 'Summaries generated successfully but could not be saved to database'
        })
      }
    }
    
    // Return the summaries
    return NextResponse.json({
      success: true,
      summaries
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