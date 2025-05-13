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