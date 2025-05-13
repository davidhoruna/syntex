import { extractTextFromPDFWithLangChain } from './langchain-utils';
import { storeDocumentEmbeddings } from './langchain-utils';
import { createClient } from '@supabase/supabase-js';

// Get Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Process and store a document with vector embeddings
 * @param file The PDF file to process
 * @param userId The user ID who owns the document
 * @param metadata Additional metadata to store with the document
 * @returns Result object with success status and document ID
 */
export async function processAndStoreDocument(
  file: File,
  userId: string,
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    // Extract text from PDF
    const text = await extractTextFromPDFWithLangChain(file);
    
    if (!text || text.length < 50) {
      return { 
        success: false, 
        error: 'Could not extract meaningful text from document' 
      };
    }
    
    // Prepare metadata
    const docMetadata = {
      ...metadata,
      user_id: userId,
      title: file.name,
      size: file.size,
      type: file.type,
      created_at: new Date().toISOString()
    };
    
    // Store the document in database (this example just uses Supabase directly)
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database connection failed' };
    }
    
    // Insert document content
    const { data, error } = await supabase
      .from('documents')
      .insert({
        content: text,
        metadata: docMetadata
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error storing document:', error);
      return { success: false, error: 'Failed to store document' };
    }
    
    // Store embeddings (this will update the embedding column for the document)
    await storeDocumentEmbeddings(text, { 
      id: data.id,
      ...docMetadata 
    });
    
    return { 
      success: true, 
      documentId: data.id
    };
  } catch (error) {
    console.error('Error processing document:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 