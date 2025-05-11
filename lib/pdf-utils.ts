// PDF processing utilities
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Only import PDF.js on the client side
let pdfjs: any;
if (typeof window !== 'undefined') {
  // Dynamic import for client-side only
  import('pdfjs-dist').then((module) => {
    pdfjs = module;
    initPdfWorker();
  });
}

// Initialize PDF.js worker
// Use a CDN for the worker to avoid bundling issues
function initPdfWorker() {
  if (typeof window !== 'undefined' && pdfjs && !pdfjs.GlobalWorkerOptions.workerSrc) {
    // Use a CDN version of the worker that matches the package version
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  }
}

/**
 * Extract text from a PDF file
 * @param file PDF file to extract text from
 * @param useServerApi Whether to use the server API for extraction (better for large files)
 * @returns Extracted text content
 */
export async function extractTextFromPDF(file: File, useServerApi = false): Promise<string> {
  // Always use server API when running on the server
  if (typeof window === 'undefined' || useServerApi || file.size > 5 * 1024 * 1024) { // 5MB threshold
    return extractTextFromPDFServer(file);
  }
  
  // For smaller files, process on the client
  // Ensure pdfjs is loaded
  if (!pdfjs) {
    pdfjs = await import('pdfjs-dist');
    initPdfWorker();
  }
  
  try {
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    // Extract text from each page
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from a PDF file using the server API
 * @param file PDF file to extract text from
 * @returns Extracted text content
 */
async function extractTextFromPDFServer(file: File): Promise<string> {
  try {
    // Create a FormData object and append the file
    const formData = new FormData();
    formData.append('file', file);
    
    // Send the file to the server API
    const response = await fetch('/api/pdf/extract', {
      method: 'POST',
      body: formData,
    });
    
    // Parse the response
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to extract text from PDF');
    }
    
    console.log('PDF extraction successful:', { 
      pageCount: result.pageCount,
      textLength: result.text.length
    });
    
    return result.text;
  } catch (error) {
    console.error('Error extracting text from PDF using server API:', error);
    throw new Error('Failed to extract text from PDF using server API');
  }
}

/**
 * Generate summaries from extracted text
 * @param text Text to generate summaries from
 * @param numSummaries Number of summary points to generate
 * @param useServerApi Whether to use the server API for summarization
 * @returns Array of summary points
 */
export async function generateSummaries(text: string, numSummaries = 5, useServerApi = true): Promise<string[]> {
  // For better performance, use the server API by default
  if (useServerApi) {
    return generateSummariesServer(text, numSummaries);
  }
  
  // Client-side summarization as fallback
  try {
    // Trim text if it's too long (OpenAI has token limits)
    const trimmedText = text.length > 15000 ? text.substring(0, 15000) + '...' : text;
    
    const prompt = `
    Extract the ${numSummaries} most important key points from the PDF document text below.
    Create self-contained flashcards that someone could study to learn the material.
    Each flashcard should focus on a single concept, fact, or idea from the document.
    Write each flashcard as a concise, standalone statement that captures essential information.
    Don't use bullet points or numbering.
    
    TEXT FROM PDF:
    ${trimmedText}
    `;
    
    const { text: summaryText } = await generateText({
      model: openai('gpt-4o'),
      prompt,
      temperature: 0.7,
      maxTokens: 1000,
    });
    
    // Split the summary text into individual points
    const summaries = summaryText
      .split('\n\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, numSummaries);
    
    return summaries.length > 0 ? summaries : ['No summary could be generated for this document.'];
  } catch (error) {
    console.error('Error generating summaries:', error);
    return ['Failed to generate summary. Please try again later.'];
  }
}

/**
 * Generate summaries from extracted text using the server API
 * @param text Text to generate summaries from
 * @param numSummaries Number of summary points to generate
 * @returns Array of summary points
 */
async function generateSummariesServer(text: string, numSummaries = 5): Promise<string[]> {
  try {
    // Send the text to the server API
    const response = await fetch('/api/pdf/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, numSummaries }),
    });
    
    // Parse the response
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to generate summaries');
    }
    
    return result.summaries;
  } catch (error) {
    console.error('Error generating summaries using server API:', error);
    return ['Failed to generate summary. Please try again later.'];
  }
}
