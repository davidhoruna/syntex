"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function SetupPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const searchParams = useSearchParams()
  const setupKey = searchParams.get("key")
  const { user } = useAuth()

  useEffect(() => {
    // Check if the user is authorized to access this page
    // Either they are an admin user or they have the correct setup key
    if (user || setupKey === process.env.NEXT_PUBLIC_SETUP_KEY) {
      setIsAuthorized(true)
    }
  }, [user, setupKey])

  const handleSetup = async () => {
    try {
      setStatus("loading")
      setMessage("Setting up database...")

      const response = await fetch("/api/setup-db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setupKey: setupKey || "",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage(data.message || "Database setup completed successfully")
      } else {
        setStatus("error")
        setMessage(data.error || "Failed to set up database")
      }
    } catch (error) {
      setStatus("error")
      setMessage((error as Error).message || "An error occurred")
    }
  }

  if (!isAuthorized) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
            <p className="text-zinc-400 mb-6">You are not authorized to access this page.</p>
            <Link
              href="/"
              className="w-full py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 text-center block"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Syntex Setup</h1>

          <p className="text-zinc-400 mb-6">
            This page will set up the database tables and storage buckets required for the Syntex application.
          </p>

          {status === "success" && (
            <div className="bg-green-900/20 border border-green-800 text-green-200 p-4 rounded-md mb-6">{message}</div>
          )}

          {status === "error" && (
            <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded-md mb-6">{message}</div>
          )}

          <div className="flex flex-col gap-4">
            <button
              onClick={handleSetup}
              disabled={status === "loading"}
              className="w-full py-2 bg-zinc-100 text-black rounded-md hover:bg-white disabled:opacity-70"
            >
              {status === "loading" ? "Setting up..." : "Set Up Database"}
            </button>

            {status === "success" && (
              <Link href="/" className="w-full py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 text-center">
                Go to Home
              </Link>
            )}
          </div>

          <div className="mt-6 text-xs text-zinc-500">
            <p>Note: This setup is only required once when you first deploy the application.</p>
            <p className="mt-1">
              It will create the necessary database tables and storage buckets for the Syntex application.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
