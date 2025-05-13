"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Upload, Loader2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { uploadFile } from "@/lib/file-service"

// Remove direct imports of PDF utils to avoid server-side rendering issues
// We'll use dynamic imports instead

// In a real app, this would come from a database
import { getFolders } from "@/lib/db-service"
import type { Folder } from "@/lib/supabase"
 

export default function UploadPage() {
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialFolderId = searchParams.get("folder") || ""

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
          const data = await getFolders("read")
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
    e.preventDefault();
    if (!file) return;

    setUploading(true); // indicates the start of the overall process
    setProcessing(true); // show a general processing state
    setError(null);
    setProgress(0); // reset progress

    try {
        setStatus('Preparing document...');
        setProgress(10);

        // OPTIONAL: Still upload the original file if you want to store it before processing
        const uploadResult = await uploadFile(file);
        if (!uploadResult) {
            throw new Error('Failed to upload file before processing.');
        }

        setStatus('File uploaded, starting processing...');
        setProgress(30);

        // Create FormData to send to the API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('flashcardCount', flashcardCount.toString());

        setStatus('Processing document via API...');
        setProgress(50); // update progress based on API response stages if possible

        const response = await fetch('/api/pdf/process', {
            method: 'POST',
            body: formData,
        });

        setProgress(80);

        let responseData;
        try {
            responseData = await response.json();
        } catch (jsonError: any) {
            console.error('Error parsing JSON response:', jsonError);
            throw new Error(`Failed to parse API response: ${jsonError?.message || 'Unknown JSON parsing error'}`);
        }

        if (!response.ok) {
            const errorMessage = responseData?.error || `API request failed with status ${response.status}`;
            console.error('API error response:', responseData);
            throw new Error(errorMessage);
        }

        const result = responseData;

        if (result.success) {
            setStatus('Processing complete!');
            setProgress(100);

            // Save document metadata to localStorage with all processing results
            const newDocId = Date.now().toString(); // use an ID from the API if it returns one
            const newDocument = {
                id: newDocId,
                name: file.name,
                type: file.type.split('/')[1] || 'pdf',
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                uploadDate: new Date().toISOString().split('T')[0],
                folderId: folderId || '',
                path: uploadResult ? uploadResult.path : file.name, // you still use uploadFile
                fullPath: uploadResult ? uploadResult.fullPath : file.name,
                summaries: result.summaries, // summaries from the API
                extractedText: result.extractedText, // Save extracted text for potential regeneration
                embeddings: result.embeddings, // Save embeddings if needed
                processingError: null
            };
            
            // Log the document being saved for debugging
            console.log('Saving document with summaries:', {
                id: newDocId,
                name: file.name,
                summariesCount: result.summaries?.length || 0,
                extractedTextLength: result.extractedText?.length || 0
            });

            // 1. Save to localStorage for client-side access
            const existingDocs = JSON.parse(localStorage.getItem('syntexDocuments') || '[]');
            localStorage.setItem('syntexDocuments', JSON.stringify([...existingDocs, newDocument]));
            
            // 2. Also save to Supabase database so it appears in folders
            try {
                // Import the database service
                const { uploadDocument } = await import('@/lib/db-service');
                
                if (uploadDocument && file) {
                    console.log('Saving document to Supabase database...');
                    // This will properly add the document to Supabase database with the folder ID
                    const dbDocument = await uploadDocument(file, folderId || undefined);
                    
                    if (dbDocument) {
                        console.log('Document saved to database successfully:', dbDocument.id);
                        
                        // Also save summaries to Supabase if they exist
                        if (result.summaries && result.summaries.length > 0) {
                            const { createSummary } = await import('@/lib/db-service');
                            
                            // Save each summary
                            for (const summary of result.summaries) {
                                await createSummary(dbDocument.id, summary);
                            }
                            console.log(`Saved ${result.summaries.length} summaries to database`);
                        }
                    }
                }
            } catch (dbError) {
                console.error('Error saving document to database:', dbError);
                // Continue anyway - we still have the document in localStorage
            }

            router.push(`/read/document/${newDocId}`);
        } else {
            throw new Error(result.error || 'Processing failed for an unknown reason.');
        }
    } catch (error) {
        console.error('Error in handleSubmit:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');

        // Additionally, save a record of the failed attempt to localStorage if desired
        const newDocId = Date.now().toString();
        const newDocument = {
            id: newDocId,
            name: file.name,
            type: file.type.split('/')[1] || 'pdf',
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            uploadDate: new Date().toISOString().split('T')[0],
            folderId: folderId || '',
            path: file.name, // from uploadResult if used
            summaries: ['Failed to process document for summaries'],
            processingError: error instanceof Error ? error.message : 'Unknown error'
        };
        const existingDocs = JSON.parse(localStorage.getItem('syntexDocuments') || '[]');
        localStorage.setItem('syntexDocuments', JSON.stringify([...existingDocs, newDocument]));
        router.push(`/read/document/${newDocId}`);
    } finally {
        setUploading(false);
        setProcessing(false);
        // Optionally, keep the status message for user feedback
    }
};
  
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
