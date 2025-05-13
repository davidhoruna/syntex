"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Upload, Loader2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { uploadFile } from "@/lib/file-service"
// Remove direct imports of PDF utils to avoid server-side rendering issues
// We'll use dynamic imports instead

// In a real app, this would come from a database
import { getFolders } from "@/lib/db-service"
import type { Folder } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

// Main component that handles the Suspense boundary
export default function UploadPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirectTo=${encodeURIComponent('/math/upload')}`)
    }
  }, [user, loading, router])
  
  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    )
  }
  
  // If not authenticated, don't render the form at all (will redirect)
  if (!user) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto py-8">
        <div className="max-w-xl mx-auto bg-zinc-900 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center mb-6">
              <Link href="/math" className="text-zinc-400 hover:text-white mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-bold">Upload Document</h1>
            </div>
            
            <Suspense fallback={<div className="p-4 text-center"><Loader2 className="h-6 w-6 text-blue-500 animate-spin mx-auto mb-2" />Loading form...</div>}>
              <UploadForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

// Component that uses useSearchParams, wrapped in Suspense
function UploadForm() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialFolderId = searchParams.get("folder") || ""
  
  // Additional safety - if somehow the form loads without auth
  if (!user) {
    return (
      <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded-md">
        Please <Link href="/login" className="text-white underline">log in</Link> to upload documents.
      </div>
    )
  }

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [folderId, setFolderId] = useState(initialFolderId)
  const [error, setError] = useState<string | null>(null)
  const [flashcardCount, setFlashcardCount] = useState(5)
  
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadFolders() {
      try {
        setLoading(true)
        const data = await getFolders("math")
        setFolders(data)
        setError(null)
      } catch (err) {
        console.error("Error loading folders:", err)
        setError("Failed to load folders")
      } finally {
        setLoading(false)
      }
    }

    loadFolders()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Ensure it's a PDF
      if (!selectedFile.type.includes('pdf')) {
        setError('Please select a valid PDF file');
        return;
      }
      
      // Check file size (limit to 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File is too large. Maximum size is 10MB');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setProcessing(true)
    setError(null)

    try {
      setStatus('Uploading file...')
      
      // 1. Upload the file
      const result = await uploadFile(file)
      if (!result) throw new Error('Failed to upload file')
      
      setStatus('Extracting text from PDF...')
      setProgress(30)
      
      try {
        // 2. Dynamic import of PDF utils
        const { extractTextFromPDFWithLangChain, generateSummariesWithLangChain } = await import('@/lib/langchain-utils')
        
        // Convert file to ArrayBuffer for processing
        const fileBuffer = await file.arrayBuffer();
        
        // 3. Extract text from PDF
        const extractedText = await extractTextFromPDFWithLangChain(fileBuffer)
        
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('Could not extract text from PDF. The file might be scanned or protected')
        }
        
        setStatus('Generating summaries...')
        setProgress(60)
        
        // 4. Generate summaries
        // This will use mock summaries in client-side environment
        const summaries = await generateSummariesWithLangChain(extractedText, flashcardCount)
        
        setStatus('Processing complete...')
        setProgress(80)
        
        setStatus('Saving document...')
        setProgress(90)
        
        // 4. First create the document record in the database
        const { uploadDocument } = await import('@/lib/db-service');
        
        setStatus('Creating document record...');
        console.log('Creating document record in database');
        
        const documentRecord = await uploadDocument(file, folderId || '');
        
        if (!documentRecord) {
          throw new Error('Failed to create document record in database');
        }
        
        console.log('Document record created in database:', documentRecord);
        
        // 5. Create FormData to pass to server for processing content and saving summaries
        const formData = new FormData();
        formData.append('file', file);
        formData.append('flashcardCount', flashcardCount.toString());
        formData.append('documentId', documentRecord.id); // Pass the document ID
        
        setStatus('Sending to API for processing...');
        setProgress(75);
        
        // 6. Process with API to save content and embeddings to database
        try {
          const response = await fetch('/api/pdf/process', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData?.error || `API request failed with status ${response.status}`);
          }
          
          console.log('Successfully processed document with API');
        } catch (apiError) {
          console.error('Error processing document with API:', apiError);
          // Continue even if API processing fails - we already have the summaries
        }
        
        // 7. Create document object for localStorage
        const newDocument = {
          id: documentRecord.id, // Use database ID
          name: file.name,
          type: file.type.split('/')[1] || 'pdf',
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          uploadDate: new Date().toISOString().split('T')[0],
          folderId: folderId || '',
          path: documentRecord.file_path || '',
          fullPath: documentRecord.file_path || '',
          isLocal: false,
          localUrl: null,
          summaries,
          extractedText: extractedText.substring(0, 5000) // Store first 5000 chars for reference
        }
        
        // 8. Store in localStorage
        const existingDocs = JSON.parse(localStorage.getItem('syntexDocuments') || '[]')
        localStorage.setItem('syntexDocuments', JSON.stringify([...existingDocs, newDocument]))
        
        // Document is already saved to Supabase database
        if (documentRecord) {
          console.log('Document saved to database successfully:', documentRecord.id);
          
          // The summaries should be saved by the API call to /api/pdf/process
          // No need to manually save them here since we passed the documentId
        }
        
        // 7. Redirect to the document page
        router.push(`/math/document/${documentRecord.id}`);
      } catch (processingError) {
        console.error('Error processing PDF:', processingError);
        
        // Still save the document even if processing failed
        const newDocId = Date.now().toString()
        const newDocument = {
          id: newDocId,
          name: file.name,
          type: file.type.split('/')[1] || 'pdf',
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          uploadDate: new Date().toISOString().split('T')[0],
          folderId: folderId || '',
          path: result.path,
          fullPath: result.fullPath,
          isLocal: result.isLocal || false,
          localUrl: result.localUrl || null,
          summaries: ['Failed to process document for summaries'],
          processingError: processingError instanceof Error ? processingError.message : 'Unknown error'
        }
        
        // Store in localStorage
        const existingDocs = JSON.parse(localStorage.getItem('syntexDocuments') || '[]')
        localStorage.setItem('syntexDocuments', JSON.stringify([...existingDocs, newDocument]))
        
        // Redirect to the document page
        router.push(`/read/topics/${newDocId}`)
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      setError(error instanceof Error ? error.message : 'Error uploading document. Please try again.')
    } finally {
      setUploading(false)
      setProcessing(false)
      setProgress(0)
      setStatus('')
    }
  }

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link
            href={folderId ? `/read/folder/${folderId}` : "/read"}
            className="inline-flex items-center text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h1 className="text-xl font-bold mb-4">Upload Document</h1>

          {error && (
            <div className="bg-red-900/20 border border-red-900 rounded-md p-3 mb-4 flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="pdf-upload" className="text-sm font-medium text-zinc-300">
                Select PDF
              </label>
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-zinc-500 transition-colors">
                <input 
                  id="pdf-upload" 
                  type="file" 
                  accept=".pdf,application/pdf" 
                  onChange={handleFileChange} 
                  className="hidden" 
                  disabled={uploading}
                />
                <label htmlFor="pdf-upload" className={`flex flex-col items-center justify-center ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  {uploading ? (
                    <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-2" />
                  ) : (
                    <Upload className="h-10 w-10 text-zinc-500 mb-2" />
                  )}
                  <p className="text-sm text-zinc-400">
                    {file ? file.name : 'Click to select or drag and drop PDF file'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Max file size: 10MB
                  </p>
                </label>
                
                {processing && (
                  <div className="mt-4 space-y-2">
                    <div className="w-full bg-zinc-800 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-zinc-400">{status}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="folder" className="text-sm font-medium text-zinc-300">
                Select Folder
              </label>
              <select
                id="folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              >
                <option value="">No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="flashcard-count" className="text-sm font-medium text-zinc-300">
                  Number of Flashcards
                </label>
                <span className="text-sm font-medium text-zinc-400">{flashcardCount}</span>
              </div>
              <input
                id="flashcard-count"
                type="range"
                min="3"
                max="10"
                value={flashcardCount}
                onChange={(e) => setFlashcardCount(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-zinc-500">
                <span>3</span>
                <span>10</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-zinc-100 text-black rounded-md hover:bg-white"
              disabled={!file || uploading}
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
