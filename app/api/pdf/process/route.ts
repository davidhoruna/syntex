import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDFWithLangChain, generateSummariesWithLangChain, generateEmbedding } from '@/lib/langchain-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('PDF processing request received');
    
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const flashcardCountValue = formData.get('flashcardCount');
    const flashcardCount = flashcardCountValue ? parseInt(flashcardCountValue as string) : 5;
    
    if (!file) {
      console.error('No file provided in request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);
    
    try {
      // Convert file to ArrayBuffer for better processing
      const fileBuffer = await file.arrayBuffer();
      console.log('File converted to ArrayBuffer successfully');
      
      // 1. Extract text from PDF
      console.log('Starting text extraction...');
      const extractedText = await extractTextFromPDFWithLangChain(fileBuffer);
      console.log(`Text extraction complete. Extracted ${extractedText?.length || 0} characters`);
      
      if (!extractedText || extractedText.trim().length === 0) {
        console.error('No text extracted from PDF');
        return NextResponse.json({ 
          error: 'Could not extract text from PDF. The file might be scanned or protected' 
        }, { status: 400 });
      }
      
      // 2. Generate summaries
      console.log(`Generating ${flashcardCount} summaries...`);
      const summaries = await generateSummariesWithLangChain(extractedText, flashcardCount);
      console.log('Summaries generation complete');
      
      // 3. Generate embeddings if needed
      let embeddings = null;
      try {
        console.log('Generating embeddings...');
        // Only generate embeddings for the first 8000 chars to avoid token limits
        const textForEmbedding = extractedText.substring(0, 8000);
        embeddings = await generateEmbedding(textForEmbedding);
        console.log('Embeddings generated successfully');
      } catch (embeddingError) {
        console.error('Error generating embeddings:', embeddingError);
        console.error(JSON.stringify(embeddingError, Object.getOwnPropertyNames(embeddingError)));
        // Continue even if embeddings fail
      }
      
      // 4. Extract document ID from formData if provided
      const documentId = formData.get('documentId');
      
      // 5. If document ID is provided, save content, embedding, and metadata to database
      if (documentId) {
        try {
          // Import required modules
          const { createClient } = await import('@supabase/supabase-js');
          
          console.log(`Saving document data to database for document ID: ${documentId}`);
          
          // Create direct Supabase client for server-side usage
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://etltjlriajrbrqfxreet.supabase.co';
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          
          if (!supabaseServiceKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
            throw new Error('Missing Supabase service role key');
          }
          
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          // Get the document to obtain the user_id (needed for the update)
          const { data: document, error: getDocError } = await supabase
            .from('documents')
            .select('user_id')
            .eq('id', documentId)
            .single();
            
          if (getDocError || !document) {
            console.error('Error getting document details:', getDocError);
            throw new Error(`Could not find document with ID ${documentId}`);
          }
          
          // Update document with content, embedding, and metadata
          const { data: updatedDoc, error: updateError } = await supabase
            .from('documents')
            .update({
              content: extractedText.substring(0, 10000), // First 10K chars
              embedding: embeddings,
              metadata: { 
                summaries_count: summaries.length,
                processed_at: new Date().toISOString()
              }
            })
            .eq('id', documentId)
            .eq('user_id', document.user_id)
            .select();
          
          if (updateError) {
            console.error('Error updating document content in database:', updateError);
          } else {
            console.log('Successfully updated document content in database');
          }
          
          // Save each summary to the database
          if (summaries && summaries.length > 0) {
            console.log(`Saving ${summaries.length} summaries to database`);
            
            // Clear any existing summaries for this document
            const { error: deleteError } = await supabase
              .from('summaries')
              .delete()
              .eq('document_id', documentId);
              
            if (deleteError) {
              console.error('Error deleting existing summaries:', deleteError);
            }
            
            // Save each summary directly using Supabase
            for (const content of summaries) {
              const { error } = await supabase
                .from('summaries')
                .insert([{ document_id: documentId, content }]);
                
              if (error) {
                console.error('Error saving summary:', error);
              }
            }
            
            console.log('Successfully saved summaries to database');
          }
        } catch (dbError) {
          console.error('Error saving to database:', dbError);
          // Continue even if database operations fail
        }
      }
      
      console.log('PDF processing complete, returning success response');
      return NextResponse.json({
        success: true,
        extractedText: extractedText.substring(0, 5000), // Return first 5000 chars for reference
        summaries,
        embeddings
      });
    } catch (processingError) {
      console.error('Error processing the PDF file:', processingError);
      console.error(JSON.stringify(processingError, Object.getOwnPropertyNames(processingError)));
      return NextResponse.json({
        error: processingError instanceof Error ? 
          `PDF processing error: ${processingError.message}` : 
          'Unknown error during PDF processing'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Fatal error in API route:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
    
    // Check for environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is missing in environment variables');
      return NextResponse.json({ 
        error: 'API configuration error: OpenAI API key is missing' 
      }, { status: 500 });
    }
    
    // Handle generic errors
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error processing PDF',
      details: error instanceof Error ? error.stack : 'No stack trace available'
    }, { status: 500 });
  }
}