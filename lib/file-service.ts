import { supabase } from "./supabase"
import { extractTextFromPDF } from "./pdf-utils"

// Upload a file to Supabase Storage
export async function uploadFile(file: File, bucket = "files") {
  try {
    // Create a unique filename with timestamp to avoid collisions
    const timestamp = new Date().getTime()
    const fileExt = file.name.split(".").pop() || 'pdf'
    const fileName = `file_${timestamp}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`
    
    // Try uploading to Supabase first
    try {
      // Upload with upsert: true to overwrite if file exists
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true })

      if (error) {
        console.error("Error uploading file to Supabase:", error)
        throw error
      }

      return {
        path: data.path,
        fullPath: `${bucket}/${data.path}`,
        name: file.name,
        size: file.size,
        type: file.type,
      }
    } catch (supabaseError) {
      console.error("Supabase storage error:", supabaseError)
      
      // Fallback to local storage if Supabase upload fails
      // This creates a local reference that will be lost on browser refresh
      console.log("Using local storage fallback for file...")
      return {
        path: fileName,
        fullPath: fileName,
        name: file.name,
        size: file.size,
        type: file.type,
        // Store a local URL to the file content to enable viewing
        localUrl: URL.createObjectURL(file),
        // Flag to indicate this is a local file, not in Supabase
        isLocal: true
      }
    }
  } catch (error) {
    console.error("Error in uploadFile function:", error)
    return null
  }
}

// Get a public URL for a file
export async function getFileUrl(path: string, bucket = "files") {
  try {
    // Check if it's a local file first
    if (path.startsWith('blob:') || path.includes('localUrl')) {
      return path
    }
    
    const { data } = await supabase.storage.from(bucket).getPublicUrl(path)
    return data?.publicUrl || null
  } catch (error) {
    console.error("Error getting file URL:", error)
    return null
  }
}

// Delete a file from storage
export async function deleteFile(path: string, bucket = "files") {
  // For local files, just return success
  if (path.startsWith('blob:') || path.includes('localUrl')) {
    return true
  }
  
  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    console.error("Error deleting file:", error)
    return false
  }

  return true
}

// Extract text from a PDF file
// This is a wrapper around the extractTextFromPDF function from pdf-utils
// to maintain backward compatibility
export async function extractTextFromPdf(file: File): Promise<string> {
  // This function should only be called on the client side
  if (typeof window === 'undefined') {
    console.warn('extractTextFromPdf was called on the server side, which is not supported');
    return '';
  }
  
  try {
    return await extractTextFromPDF(file, true);
  } catch (error) {
    console.error("Error extracting text from PDF:", error)
    return ""
  }
}
