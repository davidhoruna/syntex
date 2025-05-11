import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { DocumentList } from "@/components/read/document-list"

// In a real app, this would come from a database
const folders = {
  "1": { id: "1", name: "Research Papers", documentCount: 5 },
  "2": { id: "2", name: "Textbooks", documentCount: 3 },
  "3": { id: "3", name: "Articles", documentCount: 7 },
  "4": { id: "4", name: "Lecture Notes", documentCount: 4 },
  "5": { id: "5", name: "Personal", documentCount: 2 },
}

interface FolderPageProps {
  params: Promise<{ id: string }> | { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function FolderPage({ params }: FolderPageProps) {
  // Await params to access its properties
  const resolvedParams = await params
  // Get the folder ID from params
  const folderId = Array.isArray(resolvedParams.id) ? resolvedParams.id[0] : resolvedParams.id
  
  // Get folder data
  const folder = folders[folderId as keyof typeof folders] || {
    id: folderId,
    name: "Unknown Folder",
    documentCount: 0,
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
          <h2 className="text-xl font-medium">Documents</h2>
          <Link
            href={`/read/upload?folder=${folder.id}`}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 rounded-md hover:bg-zinc-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Document</span>
          </Link>
        </div>

        <DocumentList folderId={folder.id} />
      </div>
    </div>
  )
}
