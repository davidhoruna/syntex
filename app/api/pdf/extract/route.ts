import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromPDFWithLangChain, fallbackPDFExtraction } from '@/lib/langchain-utils'

/**
 * API route to extract text from a PDF file that has been uploaded
 * 
 * POST /api/pdf/extract
 * body: FormData with 'file' field containing a PDF file
 */
export async function POST(request: NextRequest) {
  try {
    // Get the PDF file from the request
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Check file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }
    
    // Extract basic metadata
    const fileName = file.name
    const fileSize = file.size
    const fileType = file.type
    
    try {
      // Use LangChain to extract text
      const text = await extractTextFromPDFWithLangChain(file)
      
      // Count approximate pages by looking at paragraph breaks
      const pageCount = Math.max(1, Math.ceil(text.split('\n\n').length / 5))
      
      // Return the extracted text
      return NextResponse.json({
        success: true,
        text: text,
        pageCount: pageCount,
        metadata: {
          fileName,
          fileSize,
          fileType
        }
      })
    } catch (error) {
      console.error('PDF parsing error:', error)
      
      // Try fallback extraction method
      try {
        console.log('Attempting fallback extraction method...')
        const fallbackText = await fallbackPDFExtraction(file)
        
        if (fallbackText && fallbackText.length > 100) {
          return NextResponse.json({
            success: true,
            text: fallbackText,
            pageCount: 1,
            metadata: {
              fileName,
              fileSize,
              fileType
            },
            warning: "Used fallback extraction method. Results may be incomplete."
          })
        }
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError)
      }
      
      // Final fallback to a placeholder
      const placeholderText = `This text was extracted from "${fileName}" (${fileSize} bytes).
      
      The PDF content would appear here. Due to technical limitations with PDF processing, 
      we're using a placeholder for now.
      
      For the best summarization results, we recommend using shorter PDFs with clear text content.`
      
      return NextResponse.json({
        success: true,
        text: placeholderText,
        pageCount: 1,
        metadata: {
          fileName,
          fileSize,
          fileType
        },
        warning: "PDF extraction encountered issues, using placeholder text"
      })
    }
  } catch (error) {
    console.error('Error processing PDF:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process PDF',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 