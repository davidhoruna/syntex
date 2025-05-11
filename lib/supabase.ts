import { createClient } from "@supabase/supabase-js"

// Use the environment variables provided
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side operations that require elevated privileges
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase

// Helper function to get the current user
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// Helper function to check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser()
  return !!user
}

// Database types
export type Folder = {
  id: string
  name: string
  user_id: string
  created_at: string
  updated_at: string
  section: "math" | "read"
}

export type Topic = {
  id: string
  name: string
  difficulty: "easy" | "medium" | "hard"
  progress: number
  folder_id: string
  user_id: string
  created_at: string
  updated_at: string
}

export type Document = {
  id: string
  name: string
  type: string
  size: number
  folder_id: string
  user_id: string
  file_path: string
  created_at: string
  updated_at: string
}

export type Summary = {
  id: string
  document_id: string
  content: string
  created_at: string
}
