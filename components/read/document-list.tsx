"use client"

import { useState, useCallback, useEffect, memo } from "react"
import Link from "next/link"
import { ArrowRight, FileText, Trash2, Loader2 } from "lucide-react"
import { getDocuments, deleteDocument } from "@/lib/db-service"
import { getFileUrl } from "@/lib/file-service"
import type { Document } from "@/lib/supabase"

interface DocumentListProps {
  folderId?: string
}

export const DocumentList = memo(function DocumentList({ folderId }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  
  // Fetch documents from Supabase
  useEffect(() => {
    async function fetchDocuments() {
      try {
        setLoading(true);
        const docs = await getDocuments(folderId);
        setDocuments(docs);
        setError(null);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('Failed to load documents');
      } finally {
        setLoading(false);
      }
    }
    
    fetchDocuments();
  }, [folderId]);
  
  // Handle document deletion
  const removeDocument = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      setDeletingIds(prev => ({ ...prev, [id]: true }));
      
      // Delete document using Supabase
      const success = await deleteDocument(id);
      
      if (success) {
        // Remove from local state
        setDocuments((prevDocs) => prevDocs.filter((doc) => doc.id !== id));
      } else {
        alert("Failed to delete document. Please try again.");
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert("An error occurred while deleting the document.");
    } finally {
      setDeletingIds(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  }, []);
  
  // Show loading state
  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-400">
        <div className="flex justify-center items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading documents...</span>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-400">
        {error}
      </div>
    );
  }

  // Show empty state
  if (documents.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-400">
        No documents in this folder. Upload a document to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentItem 
          key={doc.id} 
          document={doc} 
          onRemove={removeDocument} 
          isDeleting={deletingIds[doc.id] || false}
        />
      ))}
    </div>
  );
});

// Extract document item to its own component for better performance
const DocumentItem = memo(function DocumentItem({
  document,
  onRemove,
  isDeleting
}: {
  document: Document;
  onRemove: (id: string) => void;
  isDeleting: boolean;
}) {
  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FileText className="h-5 w-5 mr-3 text-zinc-400 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-medium text-white truncate">{document.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                {document.type.toUpperCase()}
              </span>
              <span className="text-xs text-zinc-500">{formatFileSize(document.size)}</span>
              <span className="text-xs text-zinc-500">
                {new Date(document.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <button
            className="text-zinc-400 hover:text-red-400 p-1 rounded-full hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onRemove(document.id)}
            disabled={isDeleting}
            aria-label={`Remove ${document.name}`}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
          <Link
            href={`/read/document/${document.id}`}
            className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800"
            aria-label={`View ${document.name}`}
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
});
