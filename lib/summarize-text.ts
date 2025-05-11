import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

/**
 * Generate summaries from extracted text using the AI service
 * @param text Text to generate summaries from
 * @param numSummaries Number of summary points to generate
 * @returns Array of summary points
 */
export async function generateDocumentSummaries(text: string, numSummaries = 5): Promise<string[]> {
  // Dynamically import the generateSummaries function
  if (typeof window !== 'undefined') {
    try {
      const { generateSummaries } = await import('./pdf-utils');
      return generateSummaries(text, numSummaries);
    } catch (error) {
      console.error('Error loading PDF utilities:', error);
      return ['Failed to generate summary. Error loading PDF utilities.'];
    }
  }
  
  // Server-side fallback to prevent SSR errors
  return ['Summaries will be generated on the client side.'];
}

export default generateDocumentSummaries;
