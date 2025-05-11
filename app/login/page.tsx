"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Github } from "lucide-react"

export default function LoginPage() {
  const { user, signInWithGitHub, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const redirectTo = searchParams.get("redirectTo")

  // Store the redirect URL in localStorage for use after auth callback
  useEffect(() => {
    if (redirectTo) {
      localStorage.setItem("redirectTo", redirectTo)
    }
  }, [redirectTo])

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      const redirect = redirectTo || "/"
      router.push(redirect)
    }
  }, [user, loading, router, redirectTo])

  return (
    <div className="container flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full p-8 bg-zinc-900 border border-zinc-800 rounded-lg">
        <h1 className="text-3xl font-bold text-center mb-8">Syntex</h1>

        {error && <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded-md mb-6">{error}</div>}

        <p className="text-zinc-400 text-center mb-6">
          Sign in to save your topics, documents, and progress across devices.
        </p>

        <button
          onClick={signInWithGitHub}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-3 px-4 rounded-md transition-colors"
        >
          <Github className="h-5 w-5" />
          <span>Sign in with GitHub</span>
        </button>
      </div>
    </div>
  )
}
