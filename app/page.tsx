import Link from "next/link"
import { BookOpen, Calculator } from "lucide-react"
import { SupabaseStatus } from "@/components/supabase-status"

export default function Home() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] py-8">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-serif mb-2 flex items-center justify-center">

          <span className="font-math">syntex</span>
        </h1>
        <p className="text-zinc-400 italic font-serif">Integrated Learning Environment</p>
      </div>

      <div className="grid grid-cols-2 gap-8 max-w-md w-full mb-12">
        <Link
          href="/math"
          className="flex flex-col items-center justify-center h-32 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <Calculator className="h-8 w-8 mb-3" />
          <span className="text-lg">Math</span>
        </Link>

        <Link
          href="/read"
          className="flex flex-col items-center justify-center h-32 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <BookOpen className="h-8 w-8 mb-3" />
          <span className="text-lg">Read</span>
        </Link>
      </div>

      <div className="max-w-md w-full">
        <SupabaseStatus />
      </div>
    </div>
  )
}
