import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  // Get the deployment URL - works in both development and production
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    try {
      const supabase = await createClient()
      
      // Exchange the auth code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error.message)
        // Redirect to login with error parameter
        return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`)
      }
      
      // Authentication succeeded, but we'll let the client page handle the final redirect
      // This is managed in the auth/callback/page.tsx which checks localStorage for redirectTo
    } catch (err) {
      console.error('Exception during auth callback:', err)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=Authentication+failed`)
    }
  }

  // URL to redirect to after sign in process completes
  // Note: The client-side callback will handle the final redirect to the original page
  return NextResponse.redirect(`${requestUrl.origin}/auth/callback`)
}