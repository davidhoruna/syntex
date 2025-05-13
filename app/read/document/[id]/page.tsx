"use client"

import { useState, useCallback, useRef, useEffect, memo } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Volume2, RotateCcw, Settings, Menu, X } from "lucide-react"
import { getDocument, getDocumentUrl, getSummaries } from "@/lib/db-service"
// PDF processing is handled by API routes

// Remove all mock data
const documentSummaries: Record<string, string[]> = {}

export default function DocumentPage({ params }: { params: { id: string } }) {
  // Get the document ID directly
  const documentId = params.id
  
  // Default document if not found
  const defaultDocument = {
    id: documentId,
    name: "Unknown Document.pdf",
    type: "pdf",
    size: "0 MB",
    uploadDate: new Date().toISOString().split('T')[0],
    folderId: "",
  }
  
  // Get summaries for this document or use a default message
  const defaultSummaries = ["This document was uploaded by you. No AI-generated summaries are available yet."]

  return (
    <DocumentViewer 
      documentId={documentId} 
      defaultDocument={defaultDocument}
      defaultSummaries={defaultSummaries} 
    />
  )
}

// Client-side component to handle document rendering
function DocumentViewer({ 
  documentId, 
  defaultDocument,
  defaultSummaries 
}: { 
  documentId: string, 
  defaultDocument: any,
  defaultSummaries: string[] 
}) {
  const [summaries, setSummaries] = useState<string[]>(defaultSummaries)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLocalFile, setHasLocalFile] = useState(false)
  const [documentData, setDocumentData] = useState(defaultDocument)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragDelta, setDragDelta] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const [showFlashcard, setShowFlashcard] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [flashcardCount, setFlashcardCount] = useState(5)
  const [showSettings, setShowSettings] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [extractedText, setExtractedText] = useState<string>('')
  const [generatingSummaries, setGeneratingSummaries] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  
  // Handle clicking outside the flashcard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (showFlashcard && 
          cardRef.current && 
          !cardRef.current.contains(event.target as Node)) {
        setShowFlashcard(false);
      }
    };
    
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFlashcard]);
  
  // Load document and generate summaries
  useEffect(() => {
    const loadDocument = async () => {
      try {
        // Check if we have this document in localStorage (uploaded documents)
        const storedDocs = JSON.parse(localStorage.getItem('syntexDocuments') || '[]')
        const uploadedDoc = storedDocs.find((doc: any) => doc.id === documentId)
        
        if (uploadedDoc) {
          console.log('Document found in localStorage:', {
            id: uploadedDoc.id,
            name: uploadedDoc.name,
            hasSummaries: !!uploadedDoc.summaries,
            summariesLength: uploadedDoc.summaries?.length || 0,
            hasExtractedText: !!uploadedDoc.extractedText,
            extractedTextLength: uploadedDoc.extractedText?.length || 0
          });
          
          // If we have extracted text, save it for possible regeneration
          if (uploadedDoc.extractedText) {
            setExtractedText(uploadedDoc.extractedText);
          }
          
          // Try to load summaries from different sources
          let summariesLoaded = false;
          
          // 1. First try: Check database for summaries
          try {
            const { getSummaries } = await import('@/lib/db-service');
            const dbSummaries = await getSummaries(uploadedDoc.id);
            
            if (dbSummaries && dbSummaries.length > 0) {
              console.log('Using summaries from database:', dbSummaries.length);
              const summaryContents = dbSummaries.map(summary => summary.content);
              setSummaries(summaryContents);
              summariesLoaded = true;
            }
          } catch (dbError) {
            console.error('Error loading summaries from database:', dbError);
          }
          
          // 2. Second try: Check localStorage for summaries
          if (!summariesLoaded && uploadedDoc.summaries && 
              Array.isArray(uploadedDoc.summaries) && uploadedDoc.summaries.length > 0) {
            console.log('Using summaries from localStorage:', uploadedDoc.summaries.length);
            setSummaries(uploadedDoc.summaries);
            summariesLoaded = true;
          }
          
          // 3. Third try: Generate summaries from extracted text
          if (!summariesLoaded && uploadedDoc.extractedText) {
            try {
              console.log('Generating summaries from extracted text');
              const response = await fetch('/api/pdf/summarize', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text: uploadedDoc.extractedText,
                  numSummaries: 5
                }),
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.summaries) {
                  console.log('Successfully generated summaries:', data.summaries.length);
                  setSummaries(data.summaries);
                  summariesLoaded = true;
                }
              }
            } catch (error) {
              console.error('Error generating summaries from extracted text:', error);
            }
          }
          
          // Check if it's a local file
          if (uploadedDoc.isLocal && uploadedDoc.localUrl) {
            setHasLocalFile(true);
          }
          
          // Update the document with any additional metadata
          const docData = {
            ...defaultDocument,
            ...uploadedDoc,
            name: uploadedDoc.name || defaultDocument.name
          };
          setDocumentData(docData);
          setNewFileName(docData.name); // Initialize rename field with current name
        }
      } catch (error) {
        console.error('Error loading document:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDocument()
  }, [documentId, defaultDocument])
  
  // Function to handle document rename
  const handleSaveRename = async () => {
    if (!newFileName.trim()) return;
    
    try {
      // Update in localStorage
      const storedDocs = JSON.parse(localStorage.getItem('syntexDocuments') || '[]');
      const docIndex = storedDocs.findIndex((doc: any) => doc.id === documentId);
      
      if (docIndex !== -1) {
        storedDocs[docIndex].name = newFileName.trim();
        localStorage.setItem('syntexDocuments', JSON.stringify(storedDocs));
      }
      
      // Update in database if possible
      try {
        const { updateDocument } = await import('@/lib/db-service');
        if (updateDocument) {
          await updateDocument(documentId, { name: newFileName.trim() });
          console.log('Document renamed in database');
        }
      } catch (dbError) {
        console.error('Error updating document name in database:', dbError);
        // Continue anyway since we updated localStorage
      }
      
      // Update local state
      setDocumentData((prev: typeof defaultDocument) => ({ ...prev, name: newFileName.trim() }));
      setIsRenaming(false);
    } catch (error) {
      console.error('Error renaming document:', error);
    }
  };

  // Regenerate summaries manually
  const regenerateSummaries = useCallback(async () => {
    if (!extractedText || generatingSummaries) return;
    
    setGeneratingSummaries(true);
    
    try {
      const response = await fetch('/api/pdf/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: extractedText,
          numSummaries: flashcardCount
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.summaries) {
          setSummaries(data.summaries);
          // Update in localStorage
          const storedDocs = JSON.parse(localStorage.getItem('syntexDocuments') || '[]');
          const docIndex = storedDocs.findIndex((doc: any) => doc.id === documentId);
          
          if (docIndex !== -1) {
            storedDocs[docIndex].summaries = data.summaries;
            localStorage.setItem('syntexDocuments', JSON.stringify(storedDocs));
          }
        }
      }
    } catch (error) {
      console.error('Error regenerating summaries:', error);
    } finally {
      setGeneratingSummaries(false);
    }
  }, [extractedText, flashcardCount, documentId]);
  
  // Reset drag state when changing cards
  useEffect(() => {
    setDragDelta(0)
    setIsDragging(false)
  }, [currentCardIndex])

  // Memoize handlers to prevent recreating on each render
  const nextCard = useCallback(() => {
    if (currentCardIndex < summaries.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
    }
  }, [currentCardIndex, summaries.length])

  const prevCard = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1)
    }
  }, [currentCardIndex])

  const resetCards = useCallback(() => {
    setCurrentCardIndex(0)
    setIsPlaying(false)
  }, [])

  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => !prev)
    // In a real app, this would start/stop audio playback
  }, [])

  // Handle drag interactions for card swiping
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    setDragStartX(clientX)
  }, [])

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const delta = clientX - dragStartX
    setDragDelta(delta)
  }, [isDragging, dragStartX])

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    
    // If dragged far enough, change card
    if (Math.abs(dragDelta) > 100) {
      if (dragDelta > 0 && currentCardIndex > 0) {
        prevCard()
      } else if (dragDelta < 0 && currentCardIndex < summaries.length - 1) {
        nextCard()
      }
    }
    
    // Reset drag delta
    setDragDelta(0)
  }, [isDragging, dragDelta, currentCardIndex, prevCard, nextCard, summaries.length])

  // Calculate card style based on drag state
  const cardStyle: React.CSSProperties = {
    transform: `translateX(${dragDelta}px) rotate(${dragDelta * 0.1}deg)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease',
    cursor: isDragging ? 'grabbing' : 'grab',
    maxHeight: '70vh',
    overflowY: 'auto' as const,
    WebkitOverflowScrolling: 'touch' as const
  }

  // Return loading state if still loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Render the actual component
  return (
    <div className="container py-4 md:py-8 px-3 md:px-4">
      <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <Link
            href={documentData.folderId ? `/read/folder/${documentData.folderId}` : "/read"}
            className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          
          {isRenaming ? (
            <div className="flex-1 flex items-center gap-2 px-2">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="flex-1 text-sm bg-zinc-800 border border-zinc-700 rounded px-2 py-1"
                autoFocus
              />
              <button
                onClick={handleSaveRename}
                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsRenaming(false);
                  setNewFileName(documentData.name);
                }}
                className="px-2 py-1 bg-zinc-700 text-white text-xs rounded hover:bg-zinc-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 px-2">
              <h1 className="text-lg font-bold truncate">{documentData.name}</h1>
              <button 
                onClick={() => setIsRenaming(true)}
                className="text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-zinc-800 text-xs"
              >
                Rename
              </button>
            </div>
          )}
          
          <button
            className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
            <button
              onClick={() => {
                setShowFlashcard(!showFlashcard);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-800 flex items-center justify-between"
            >
              <span>{showFlashcard ? "Hide Sections" : "View Sections"}</span>
              {showFlashcard ? <RotateCcw className="h-4 w-4" /> : null}
            </button>
            
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-zinc-800 flex items-center justify-between"
            >
              <span>Settings</span>
              <Settings className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Link
              href={documentData.folderId ? `/read/folder/${documentData.folderId}` : "/read"}
              className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 w-72"
                  autoFocus
                />
                <button
                  onClick={handleSaveRename}
                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsRenaming(false);
                    setNewFileName(documentData.name);
                  }}
                  className="px-2 py-1 bg-zinc-700 text-white text-xs rounded hover:bg-zinc-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">{documentData.name}</h1>
                <button 
                  onClick={() => setIsRenaming(true)}
                  className="text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-zinc-800 text-xs"
                >
                  Rename
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            {showFlashcard ? (
              <button
                onClick={() => setShowFlashcard(false)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800"
                title="Close summary sections"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowFlashcard(true)}
                className="text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-800"
                title="View summary sections"
              >
                View Sections
              </button>
            )}
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-lg font-medium mb-3">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Number of Summary Sections
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={flashcardCount}
                    onChange={(e) => setFlashcardCount(parseInt(e.target.value))}
                    className="w-full mr-2 accent-blue-500"
                  />
                  <span className="text-sm font-mono bg-zinc-800 px-2 py-1 rounded">{flashcardCount}</span>
                </div>
              </div>
              <button
                onClick={regenerateSummaries}
                disabled={generatingSummaries || !extractedText}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
              >
                {generatingSummaries ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white"></span>
                    Generating...
                  </>
                ) : "Regenerate Summaries"}
              </button>
            </div>
          </div>
        )}

        {/* Document preview if available */}
        {documentData.localUrl && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="text-lg font-medium mb-2">Document Preview</h2>
            <iframe 
              src={documentData.localUrl} 
              className="w-full h-[300px] md:h-[400px] lg:h-[500px] border-0 rounded-md bg-white"
              title="PDF Preview"
            />
            {hasLocalFile && (
              <p className="mt-2 text-xs text-zinc-500">
                Note: This is a local preview that will only be available in this browser session.
              </p>
            )}
          </div>
        )}

        {/* Document summary when not showing flashcards */}
        {!showFlashcard && summaries.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 md:p-6">
            <h2 className="text-lg font-medium mb-4">Document Summary</h2>
            <div className="space-y-6">
              {summaries.map((summary, index) => (
                <div key={index} className="p-4 bg-zinc-800 rounded-md">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2">Section {index + 1}</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flashcard view */}
        {showFlashcard && summaries.length > 0 && (
          <div ref={containerRef} className="relative h-[60vh] md:h-[70vh] flex flex-col items-center justify-center">          
            {/* Card container with navigation buttons */}
            <div className="relative w-full max-w-[95vw] md:max-w-2xl mx-auto">
              {/* Summary card */}
              <div 
                ref={cardRef}
                className="absolute inset-0 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden"
                style={cardStyle}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
              >
                <div className="h-full flex flex-col p-4 md:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-zinc-400">
                      Section {currentCardIndex + 1} of {summaries.length}
                    </span>
                    <button
                      className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-700"
                      onClick={(e) => { e.stopPropagation(); togglePlayback(); }}
                      aria-label={isPlaying ? "Pause audio" : "Play audio"}
                    >
                      {isPlaying ? <Volume2 className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </button>
                  </div>
                  
                  <div className="flex-grow p-4 md:p-6 overflow-y-auto">
                    <div className="prose prose-invert max-w-none">
                      <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                        {summaries[currentCardIndex]}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-zinc-700">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); prevCard(); }}
                        disabled={currentCardIndex === 0}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      
                      <div className="flex space-x-1">
                        {summaries.map((_: string, index: number) => (
                          <div 
                            key={index} 
                            className={`h-1.5 rounded-full ${index === currentCardIndex ? 'w-4 bg-white' : 'w-1.5 bg-zinc-600'}`}
                          />
                        ))}
                      </div>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); nextCard(); }}
                        disabled={currentCardIndex === summaries.length - 1}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent"
                      > 
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Swipe instruction */}
            <div className="mt-6 text-sm text-zinc-500 text-center">
              Swipe left/right to navigate between summary sections
            </div>
          </div>
        )}
        
        {/* Debug summaries state */}
        {isLoading && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <p className="text-zinc-400">Loading document summaries...</p>
          </div>
        )}
        
        {/* No summaries yet */}
        {(!summaries || !Array.isArray(summaries) || summaries.length === 0) && !isLoading && !showFlashcard && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <p className="text-zinc-400 mb-4">No summaries available for this document yet.</p>
            <button
              onClick={regenerateSummaries}
              disabled={generatingSummaries || !extractedText}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingSummaries ? "Generating..." : "Generate Summaries"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// End of file
