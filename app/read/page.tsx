import Link from "next/link"
import { FolderPlus, Upload } from "lucide-react"
import { ReadFolderGrid } from "@/components/read/folder-grid"

export default function ReadPage() {
  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Read</h1>
          <div className="flex gap-2">
            <Link
              href="/read/upload"
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 rounded-md hover:bg-zinc-700 text-sm"
            >
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </Link>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 rounded-md hover:bg-zinc-700 text-sm">
              <FolderPlus className="h-4 w-4" />
              <span>New Folder</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <ReadFolderGrid />
        </div>
      </div>
    </div>
  )
}
