import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from '@supabase/supabase-js';

// Helper function to safely get the OpenAI API key
// This helps handle both client-side and server-side environments
function getOpenAIApiKey(): string {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  if (isBrowser) {
    // In browser, try to use a public env var if available (not recommended for production)
    const publicKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (publicKey) return publicKey;
    
    // Otherwise, throw a more helpful error
    throw new Error(
      'OpenAI API key not available in client environment. ' +
      'This operation should be performed server-side using an API route.'
    );
  } else {
    // In server environment, use the private env var
    const privateKey = process.env.OPENAI_API_KEY;
    if (!privateKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    return privateKey;
  }
}
/**
 * Extracts text from a PDF file using LangChain
 * @param file PDF file to extract text from
 * @returns Extracted text content
 */

export async function extractTextFromPDFWithLangChain(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    // No need to convert to ArrayBuffer again
    // Create Blob directly from the provided ArrayBuffer
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    
    // Create PDF loader with web version that works with blobs
    const loader = new WebPDFLoader(blob);
    
    // Load PDF document
    const docs = await loader.load();
    
    // Check if we got any documents
    if (!docs || docs.length === 0) {
      throw new Error("No content extracted from PDF");
    }
    
    // Return combined text from all pages
    return docs.map((doc: any) => doc.pageContent).join('\n\n');
  } catch (error) {
    console.error("Error in LangChain PDF extraction:", error);
    throw error;
  }
}

/**
 * Generates comprehensive summaries from text using LangChain and OpenAI
 * @param text Text to generate summaries from
 * @param numSections Number of summary sections to generate
 * @returns Array of summary sections
 */
export async function generateSummariesWithLangChain(
  text: string, 
  numSections = 5
): Promise<string[]> {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  if (isBrowser) {
    // In browser environment, we can't directly use the OpenAI API
    console.warn('Running in browser environment - using mock summaries');
    
    // Return mock summaries for client-side rendering
    const mockSummaries = [];
    for (let i = 0; i < numSections; i++) {
      mockSummaries.push(`This is a placeholder summary section ${i+1}. The document processing is happening server-side, but we're showing this placeholder until it's complete.`);
    }
    return mockSummaries;
  }
  
  // Server-side implementation continues below
  try {
    // Split text into manageable chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 4000,
      chunkOverlap: 200,
    });
    
    // Create text chunks as documents
    const chunks = await splitter.createDocuments([text]);
    
    // Define output structure using a parser
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      summaries: `Array with exactly ${numSections} comprehensive summary sections, each 100-150 words long`,
    });
    
    // Create prompt template with explicit formatting instructions
    const promptTemplate = PromptTemplate.fromTemplate(`You are an expert at summarizing complex documents, especially scientific papers.
    
Create {numSections} comprehensive summary sections from this text content.
Each section should cover a major topic or theme from the document.
Each section should be 100-150 words long and should be detailed enough to understand the key concepts.

Very important: Your response MUST be a valid JSON object with a 'summaries' field containing an array of strings.
Each string in the array should be one summary section.
Do not include any explanations, just the JSON object with the summaries array.

Text content: {text}

{format_instructions}`);
    
    const formattedPrompt = await promptTemplate.format({
      text: text.length > 12000 ? text.substring(0, 12000) + "..." : text,
      numSections: numSections,
      format_instructions: parser.getFormatInstructions(),
    });
    
    // Initialize ChatOpenAI model with API key from helper function
    const apiKey = getOpenAIApiKey();
    const model = new ChatOpenAI({
      apiKey: apiKey,
      modelName: "gpt-4o", 
      temperature: 0.2,  // Lower temperature for more deterministic structured output
    });
    
    // Generate summary
    const response = await model.invoke(formattedPrompt);
    
    // Parse structured output
    try {
      // Get content as string from response
      const content = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
      
      console.log('Raw content from LLM:', content.substring(0, 200) + '...');  // log first 200 chars for debugging
        
      // First try: Extract JSON from markdown code block
      if (content.includes('```json') || content.includes('```')) {
        try {
          // Extract JSON between markdown code blocks if present
          const jsonMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
          const jsonContent = jsonMatch ? jsonMatch[1].trim() : content;
          
          console.log('Extracted JSON content:', jsonContent.substring(0, 200) + '...');
          
          const extractedJson = JSON.parse(jsonContent);
          
          if (extractedJson.summaries && Array.isArray(extractedJson.summaries)) {
            console.log(`Successfully extracted ${extractedJson.summaries.length} summaries from JSON`);
            return extractedJson.summaries;
          }
          
          // If we found summaries property but it's a string instead of array, it might be joined
          if (extractedJson.summaries && typeof extractedJson.summaries === 'string') {
            const splitSummaries = extractedJson.summaries.split(/\n{2,}|\. /).filter((s: string) => s.trim().length > 30);
            if (splitSummaries.length >= 2) {
              console.log(`Split joined summaries string into ${splitSummaries.length} summaries`);
              return splitSummaries;
            }
          }
        } catch (jsonError) {
          console.error("Error parsing JSON from markdown code block:", jsonError);
        }
      }
      
      // Second try: Use the structured parser
      try {
        const parsedOutput = await parser.parse(content);
        console.log('Parser output:', JSON.stringify(parsedOutput).substring(0, 200) + '...');
        
        if (parsedOutput.summaries && Array.isArray(parsedOutput.summaries)) {
          console.log(`Successfully parsed ${parsedOutput.summaries.length} summaries with structured parser`);
          return parsedOutput.summaries;
        }
        
        // Handle case where summaries might be a string joined with spaces
        if (parsedOutput.summaries && typeof parsedOutput.summaries === 'string') {
          // Try to split the string into multiple summaries
          const splitSummaries = parsedOutput.summaries.split(/\n{2,}|\. /).filter((s: string) => s.trim().length > 30);
          if (splitSummaries.length >= 2) {
            console.log(`Split parser output summaries into ${splitSummaries.length} summaries`);
            return splitSummaries;
          }
        }
      } catch (parserError) {
        console.error("Error with structured parser:", parserError);
      }
      
      // Third try: Split the text by sections if it seems to contain numbered sections
      if (content.includes('1.') && content.includes('2.')) {
        try {
          // Simple regex to extract sections like "1. Section content"
          const sections = content.match(/\d+\.\s+([^\d]+?)(?=\n\d+\.|$)/g) || [];
          if (sections.length >= 3) { // Only use this if we got a reasonable number of sections
            console.log(`Extracted ${sections.length} sections using regex`);
            return sections.map(section => section.trim());
          }
        } catch (regexError) {
          console.error("Error extracting sections with regex:", regexError);
        }
      }
      
      // Return default error message as last resort
      console.error("All parsing methods failed, returning default message");
      return ['No summary could be generated for this document. Please try again with a different PDF.'];
    } catch (error) {
      console.error("Error parsing model output:", error);
      
      // Fallback: try to extract summaries from raw text
      const rawText = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
      
      const sections = rawText.split(/\n{2,}/).filter(s => s.trim().length > 50);
      
      if (sections.length > 0) {
        return sections.slice(0, numSections);
      }
      
      return ['Failed to parse summary output from the model.'];
    }
  } catch (error) {
    console.error("Error generating summaries with LangChain:", error);
    return [`Error generating summaries: ${error instanceof Error ? error.message : 'Unknown error'}`];
  }
}

/**
 * Fallback mechanism for PDF extraction when primary method fails
 * Uses a simpler approach that might work for some documents
 */
export async function fallbackPDFExtraction(file: File): Promise<string> {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Try a direct text extraction from PDF binary
    // This is a simplified approach that works for some PDFs
    const uint8Array = new Uint8Array(arrayBuffer);
    let text = '';
    
    // Look for text streams in the PDF (basic approach)
    for (let i = 0; i < uint8Array.length - 7; i++) {
      // Check for stream markers in PDF
      if (uint8Array[i] === 115 && // 's'
          uint8Array[i+1] === 116 && // 't'
          uint8Array[i+2] === 114 && // 'r'
          uint8Array[i+3] === 101 && // 'e'
          uint8Array[i+4] === 97 && // 'a'
          uint8Array[i+5] === 109) { // 'm'
        
        // Skip ahead and try to extract some text
        for (let j = i + 6; j < Math.min(i + 1000, uint8Array.length); j++) {
          // Only add printable ASCII characters
          if (uint8Array[j] >= 32 && uint8Array[j] <= 126) {
            text += String.fromCharCode(uint8Array[j]);
          }
        }
      }
    }
    
    return text.length > 100 ? text : `Could not extract meaningful text from ${file.name}`;
  } catch (error) {
    console.error("Fallback PDF extraction failed:", error);
    return `Could not extract text from ${file.name}`;
  }
}

/**
 * Creates a Supabase client for vector operations
 * @returns Supabase client or null if environment variables are not set
 */
export function getSupabaseVectorClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or key not found in environment variables');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Stores embeddings for individual chunks of a document.
 * @param chunks Array of text chunks to store.
 * @param embeddings Array of corresponding embedding vectors.
 * @param originalFileName The original file name.
 * @returns Array of IDs of the inserted rows, or null if an error occurs.
 */
export async function storeChunkEmbeddings(
    chunks: string[],
    embeddings: number[][],
    originalFileName: string
): Promise<string[] | null> {
    const client = getSupabaseVectorClient();
    if (!client) return null;

    try {
        const inserts = chunks.map((chunk, index) => ({
            name: originalFileName,
            embedding: embeddings[index],
            content: chunk, // Store the actual text chunk
            metadata: { chunkIndex: index }, // Basic metadata
        }));

        const { data, error } = await client
            .from('documents')
            .insert(inserts)
            .select('id');

        if (error) {
            throw new Error(`Error inserting document chunks: ${error.message}`);
        }

        if (data) {
            return data.map(row => row.id);
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error storing document chunks:', error);
        return null;
    }
}

/**
 * Searches documents semantically using vector similarity.
 * @param queryEmbedding Embedding of the search query.
 * @param count Number of results to return.
 * @returns Search results or empty array if an error occurs.
 */
export async function searchDocuments(
    queryEmbedding: number[],
    count: number = 5
): Promise<any[]> {
    try {
        const client = getSupabaseVectorClient();
        if (!client) return [];

        const { data: documents, error } = await client.rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_count: count,
            filter: {}, // Basic search without filtering for now
        });

        if (error) {
            console.error('Error searching documents:', error);
            return [];
        }

        return documents || [];
    } catch (error) {
        console.error('Error searching documents:', error);
        return [];
    }
}


export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        // Check if we're in a browser environment
        const isBrowser = typeof window !== 'undefined';
        
        if (isBrowser) {
            // In browser environment, we can't directly use the OpenAI API
            // Return a mock embedding for now
            console.warn('Running in browser environment - embeddings not available');
            // Return a mock embedding (all zeros) with the right dimensionality for OpenAI embeddings
            return new Array(1536).fill(0);
        }
        
        // In server environment, use the API key
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set in environment variables');
        }
        
        const embeddings = new OpenAIEmbeddings({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        const result = await embeddings.embedQuery(text);
        return result;
    } catch (error) {
        console.error("Error generating embedding:", error);
        // Return a mock embedding in case of error
        return new Array(1536).fill(0);
    }
}

