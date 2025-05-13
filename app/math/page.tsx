"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { FolderPlus, Upload } from "lucide-react"
import { MathFolderGrid } from "@/components/math/folder-grid"
import { createFolder } from "@/lib/db-service"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export default function MathPage() {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const handleCreateFolder = async () => {
    if (isCreatingFolder) return
    
    // Check if user is authenticated before allowing folder creation
    if (!user) {
      // Redirect to login page with redirect back to math page
      router.push(`/login?redirectTo=${encodeURIComponent('/math')}`)
      return
    }

    const name = prompt("Enter folder name:")
    if (!name) return

    try {
      setIsCreatingFolder(true)
      const newFolder = await createFolder(name, "math")
      if (newFolder) {
        // Refresh the page to show the new folder
        window.location.reload()
      }
    } catch (err) {
      console.error("Error creating folder:", err)
      alert("Failed to create folder")
    } finally {
      setIsCreatingFolder(false)
    }
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Math</h1>
          <div className="flex gap-2">
            <Link
              href="/math/upload"
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 rounded-md hover:bg-zinc-700 text-sm"
            >
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </Link>
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 rounded-md hover:bg-zinc-700 text-sm"
              onClick={handleCreateFolder}
              disabled={isCreatingFolder}
            >
              <FolderPlus className="h-4 w-4" />
              <span>{isCreatingFolder ? "Creating..." : "New Folder"}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <MathFolderGrid />
        </div>
      </div>
    </div>
  )
}
