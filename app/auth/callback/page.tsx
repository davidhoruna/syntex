"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")
  const code = searchParams.get("code")
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      if (code) {
        // Call the API route to exchange the code for a session
        try {
          // First call our API endpoint to handle session exchange
          await fetch(`/api/auth/callback?code=${code}`)
          
          // Then get the session to confirm authentication
          const { data, error: sessionError } = await supabase.auth.getSession()

          if (sessionError) {
            throw sessionError
          }

          if (data.session) {
            // Redirect to the dashboard or home page
            const redirectTo = localStorage.getItem("redirectTo") || "/"
            localStorage.removeItem("redirectTo") // Clean up
            router.push(redirectTo)
          } else {
            // No session found, redirect to login with error
            router.push("/login?error=Authentication failed")
          }
        } catch (error) {
          console.error("Error during auth callback:", error)
          router.push("/login?error=Authentication failed")
        }
      }
    }

    if (error) {
      // Handle OAuth error
      console.error("OAuth error:", error, errorDescription)
      router.push(`/login?error=${encodeURIComponent(errorDescription || "Authentication failed")}`)
    } else {
      handleAuthCallback()
    }
  }, [router, error, errorDescription, code, supabase])

  return (
    <div className="container flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
        <p className="text-zinc-400">Please wait while we complete the authentication process.</p>
      </div>
    </div>
  )
}
