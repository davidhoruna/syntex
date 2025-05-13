"use client"

import type React from "react"

import { useEffect, useState, memo } from "react"
import Link from "next/link"
import { Folder, MoreVertical, Plus } from "lucide-react"
import { getFolders, createFolder, deleteFolder } from "@/lib/db-service"
import type { Folder as FolderType } from "@/lib/supabase"

// Memoize the component to prevent unnecessary re-renders
export const MathFolderGrid = memo(function MathFolderGrid() {
  const [folders, setFolders] = useState<FolderType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const handleCreateFolder = async () => {
    const name = prompt("Enter folder name:")
    if (!name) return

    try {
      const newFolder = await createFolder(name, "math")
      if (newFolder) {
        setFolders((prev) => [...prev, newFolder])
      }
    } catch (err) {
      console.error("Error creating folder:", err)
      alert("Failed to create folder")
    }
  }

  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm("Are you sure you want to delete this folder?")) return

    try {
      const success = await deleteFolder(id)
      if (success) {
        setFolders((prev) => prev.filter((folder) => folder.id !== id))
      }
    } catch (err) {
      console.error("Error deleting folder:", err)
      alert("Failed to delete folder")
    }
  }

  if (loading) {
    return (
      <div className="col-span-full">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-400">
          Loading folders...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="col-span-full">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-400">{error}</div>
      </div>
    )
  }

  return (
    <>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800 transition-colors cursor-pointer h-full flex flex-col items-center justify-center"
        onClick={handleCreateFolder}
      >
        <Plus className="h-8 w-8 mb-2 text-zinc-400" />
        <span className="text-zinc-400">New Folder</span>
      </div>

      {folders.map((folder) => (
        <FolderItem key={folder.id} folder={folder} onDelete={handleDeleteFolder} />
      ))}

      {folders.length === 0 && (
        <div className="col-span-full">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-400">
            No folders yet. Create a new folder to get started.
          </div>
        </div>
      )}
    </>
  )
})

// Extract folder item to its own component for better performance
const FolderItem = memo(function FolderItem({
  folder,
  onDelete,
}: {
  folder: FolderType
  onDelete: (id: string, e: React.MouseEvent) => void
}) {
  return (
    <div className="relative h-full">
      {/* Make the entire card clickable */}
      <Link 
        href={`/math/folder/${folder.id}`}
        className="block h-full"
      >
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800 transition-colors cursor-pointer h-full group">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center">
              <Folder className="h-5 w-5 mr-2 text-zinc-400 group-hover:text-white transition-colors" />
              <h3 className="text-lg font-medium group-hover:text-white transition-colors">{folder.name}</h3>
            </div>
            {/* Button positioned on top of the link for proper event handling */}
            <div className="relative z-10">
              <button
                className="text-zinc-400 hover:text-red-400 p-1 rounded-full hover:bg-zinc-700"
                onClick={(e) => onDelete(folder.id, e)}
                aria-label={`Delete ${folder.name}`}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
})
