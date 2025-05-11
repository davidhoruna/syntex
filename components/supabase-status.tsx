"use client"

import { useState, useEffect } from "react"

export function SupabaseStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading")
  const [details, setDetails] = useState<string>("")

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch("/api/supabase-test")
        const data = await response.json()

        if (response.ok) {
          setStatus("connected")
          setDetails(JSON.stringify(data, null, 2))
        } else {
          setStatus("error")
          setDetails(data.error || "Unknown error")
        }
      } catch (error) {
        setStatus("error")
        setDetails((error as Error).message)
      }
    }

    checkStatus()
  }, [])

  return (
    <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900">
      <h2 className="text-lg font-medium mb-2">Supabase Connection Status</h2>

      <div className="flex items-center gap-2 mb-4">
        <div
          className={`w-3 h-3 rounded-full ${
            status === "loading" ? "bg-yellow-500" : status === "connected" ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span>
          {status === "loading"
            ? "Checking connection..."
            : status === "connected"
              ? "Connected to Supabase"
              : "Connection error"}
        </span>
      </div>

      {details && <pre className="text-xs bg-zinc-950 p-3 rounded overflow-auto max-h-40">{details}</pre>}
    </div>
  )
}
