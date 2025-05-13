"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"
import type { User, Session } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createBrowserSupabaseClient())

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signInWithGitHub = async () => {
    try {
      // Get the current hostname - works in both localhost and production deployments
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      
      // Log auth attempt for debugging
      console.log(`Starting GitHub auth from origin: ${origin}`);
      
      // Get the correct site URL based on environment
      // For Vercel deployment, we need to use the actual deployed URL, not localhost
      const redirectUrl = isLocalhost 
        ? `${origin}/auth/callback` 
        : `${process.env.NEXT_PUBLIC_SITE_URL || origin}/auth/callback`;
      
      console.log(`Using redirect URL: ${redirectUrl}`);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: redirectUrl,
          // Make sure we don't skip the browser redirect
          skipBrowserRedirect: false,
        },
      })
      
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with GitHub:", error);
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGitHub, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
