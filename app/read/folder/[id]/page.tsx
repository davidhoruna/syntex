"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { DocumentList } from "@/components/read/document-list"
import { getFolder } from "@/lib/db-service"
import type { Folder } from "@/lib/supabase"

export default function FolderPage({ params }: { params: { id: string } }) {
  const [folder, setFolder] = useState<Folder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadFolder() {
      try {
        setLoading(true)
        const data = await getFolder(params.id)
        setFolder(data)
        setError(null)
      } catch (err) {
        console.error("Error loading folder:", err)
        setError("Failed to load folder")
      } finally {
        setLoading(false)
      }
    }

    loadFolder()
  }, [params.id])

  if (loading) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-400">
            Loading folder...
          </div>
        </div>
      </div>
    )
  }

  if (error || !folder) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-400">
            {error || "Folder not found"}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/read" className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">{folder.name}</h1>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-medium">Topics</h2>
          <Link
            href={`/read/upload?folder=${folder.id}`}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 rounded-md hover:bg-zinc-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Topic</span>
          </Link>
        </div>

        <DocumentList folderId={folder.id} />
      </div>
    </div>
  )
}
