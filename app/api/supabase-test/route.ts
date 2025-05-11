import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET() {
  try {
    // Create a Supabase client
    const supabase = await createClient()

    // Check for an active session
    const { data: { session } } = await supabase.auth.getSession()
    
    // Connection status - this will show even without authentication
    let connectionStatus = { success: true, message: "Connected to Supabase" }
    let schemaStatus = { status: "Unknown", message: "Could not determine schema status" }
    let authStatus = session ? { status: "Authenticated", user: session.user.email } : { status: "Not authenticated" }
    
    try {
      // Try a simple public query to test connection
      const { data, error } = await supabase
        .from('folders')
        .select('count')
        .limit(1)
      
      if (error) {
        // This could be due to permissions or missing tables
        schemaStatus = {
          status: "Not set up or permission denied",
          message: error.message
        }
      } else {
        schemaStatus = {
          status: "Set up",
          message: "Schema tables found"
        }
      }
    } catch (schemaError) {
      schemaStatus = {
        status: "Error",
        message: schemaError instanceof Error ? schemaError.message : String(schemaError)
      }
    }
    
    // Create the response data
    const responseData = {
      success: true,
      connection: connectionStatus,
      auth: authStatus,
      schema: schemaStatus,
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Not set",
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set",
        postgresUrl: process.env.POSTGRES_URL ? "Set" : "Not set"
      },
      ...(schemaStatus.status !== "Set up" && {
        hint: "You need to execute the schema.sql file in the Supabase SQL Editor"
      })
    }
    
    // Return the response
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Supabase test error:", error)
    return NextResponse.json(
      { 
        success: false, 
        message: "Error testing Supabase connection", 
        error: error instanceof Error ? error.message : String(error),
        environment: {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Not set",
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set"
        }
      },
      { status: 500 }
    )
  }
}
