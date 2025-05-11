"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Folder, MoreVertical } from "lucide-react"

// Define folders for the application
const folders = [
  { id: "1", name: "Research Papers" },
  { id: "2", name: "Textbooks" },
  { id: "3", name: "Articles" },
  { id: "4", name: "Lecture Notes" },
  { id: "5", name: "Personal" },
]

interface FolderWithCount {
  id: string;
  name: string;
  documentCount: number;
}

export function ReadFolderGrid() {
  const [foldersWithCounts, setFoldersWithCounts] = useState<FolderWithCount[]>([]);

  useEffect(() => {
    // Get documents from localStorage
    const getDocumentsFromStorage = () => {
      try {
        if (typeof window !== 'undefined') {
          const storedDocs = JSON.parse(localStorage.getItem('syntexDocuments') || '[]');
          
          // Count documents in each folder
          const folderCounts: Record<string, number> = {};
          storedDocs.forEach((doc: any) => {
            if (doc.folderId) {
              folderCounts[doc.folderId] = (folderCounts[doc.folderId] || 0) + 1;
            }
          });
          
          // Create folders with counts
          const foldersWithData = folders.map(folder => ({
            ...folder,
            documentCount: folderCounts[folder.id] || 0
          }));
          
          setFoldersWithCounts(foldersWithData);
        }
      } catch (error) {
        console.error('Error getting documents from localStorage:', error);
        setFoldersWithCounts(folders.map(folder => ({ ...folder, documentCount: 0 })));
      }
    };
    
    getDocumentsFromStorage();
    
    // Update when localStorage changes
    const handleStorageChange = () => {
      getDocumentsFromStorage();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <>
      {foldersWithCounts.map((folder) => (
        <Link key={folder.id} href={`/read/folder/${folder.id}`}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800 transition-colors cursor-pointer h-full group">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <Folder className="h-5 w-5 mr-2 text-zinc-400 group-hover:text-white transition-colors" />
                <h3 className="text-lg font-medium">{folder.name}</h3>
              </div>
              <button className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-700">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-zinc-400">{folder.documentCount} documents</p>
          </div>
        </Link>
      ))}
    </>
  );
}
