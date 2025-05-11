import { createBrowserSupabaseClient } from "./supabase-browser"
import type { Folder, Topic, Document, Summary } from "./supabase"

// Create a Supabase client
const supabase = createBrowserSupabaseClient()

// Helper function to get the current user ID
async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id
}

// ==================== FOLDER OPERATIONS ====================

// Get all folders for the current user
export async function getFolders(section: "math" | "read") {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .eq("section", section)
    .order("name")

  if (error) {
    console.error("Error fetching folders:", error)
    return []
  }

  return data as Folder[]
}

// Get a single folder by ID
export async function getFolder(id: string) {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data, error } = await supabase.from("folders").select("*").eq("id", id).eq("user_id", userId).single()

  if (error) {
    console.error("Error fetching folder:", error)
    return null
  }

  return data as Folder
}

// Create a new folder
export async function createFolder(name: string, section: "math" | "read") {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data, error } = await supabase
    .from("folders")
    .insert([{ name, section, user_id: userId }])
    .select()

  if (error) {
    console.error("Error creating folder:", error)
    return null
  }

  return data[0] as Folder
}

// Update a folder
export async function updateFolder(id: string, name: string) {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data, error } = await supabase
    .from("folders")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select()

  if (error) {
    console.error("Error updating folder:", error)
    return null
  }

  return data[0] as Folder
}

// Delete a folder
export async function deleteFolder(id: string) {
  const userId = await getCurrentUserId()
  if (!userId) return false

  const { error } = await supabase.from("folders").delete().eq("id", id).eq("user_id", userId)

  if (error) {
    console.error("Error deleting folder:", error)
    return false
  }

  return true
}

// ==================== TOPIC OPERATIONS ====================

// Get all topics for the current user
export async function getTopics(folderId?: string) {
  const userId = await getCurrentUserId()
  if (!userId) return []

  let query = supabase.from("topics").select("*").eq("user_id", userId).order("name")

  if (folderId) {
    query = query.eq("folder_id", folderId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching topics:", error)
    return []
  }

  return data as Topic[]
}

// Get a single topic by ID
export async function getTopic(id: string) {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data, error } = await supabase.from("topics").select("*").eq("id", id).eq("user_id", userId).single()

  if (error) {
    console.error("Error fetching topic:", error)
    return null
  }

  return data as Topic
}

// Create a new topic
export async function createTopic(name: string, difficulty: "easy" | "medium" | "hard", folderId: string) {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data, error } = await supabase
    .from("topics")
    .insert([
      {
        name,
        difficulty,
        folder_id: folderId,
        progress: 0,
        user_id: userId,
      },
    ])
    .select()

  if (error) {
    console.error("Error creating topic:", error)
    return null
  }

  return data[0] as Topic
}

// Update a topic
export async function updateTopic(
  id: string,
  updates: { name?: string; difficulty?: "easy" | "medium" | "hard"; progress?: number; folder_id?: string },
) {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data, error } = await supabase
    .from("topics")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select()

  if (error) {
    console.error("Error updating topic:", error)
    return null
  }

  return data[0] as Topic
}

// Delete a topic
export async function deleteTopic(id: string) {
  const userId = await getCurrentUserId()
  if (!userId) return false

  const { error } = await supabase.from("topics").delete().eq("id", id).eq("user_id", userId)

  if (error) {
    console.error("Error deleting topic:", error)
    return false
  }

  return true
}

// ==================== DOCUMENT OPERATIONS ====================

// Get all documents for the current user
export async function getDocuments(folderId?: string) {
  const userId = await getCurrentUserId()
  if (!userId) return []

  let query = supabase.from("documents").select("*").eq("user_id", userId).order("created_at", { ascending: false })

  if (folderId) {
    query = query.eq("folder_id", folderId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching documents:", error)
    return []
  }

  return data as Document[]
}

// Get a single document by ID
export async function getDocument(id: string) {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data, error } = await supabase.from("documents").select("*").eq("id", id).eq("user_id", userId).single()

  if (error) {
    console.error("Error fetching document:", error)
    return null
  }

  return data as Document
}

// Upload a document
export async function uploadDocument(file: File, folderId?: string) {
  const userId = await getCurrentUserId()
  if (!userId) return null

  // First upload the file to Supabase Storage
  const fileExt = file.name.split(".").pop()
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  const { error: uploadError } = await supabase.storage.from("files").upload(filePath, file)

  if (uploadError) {
    console.error("Error uploading file:", uploadError)
    return null
  }

  // Then create a record in the documents table
  const { data, error } = await supabase
    .from("documents")
    .insert([
      {
        name: file.name,
        type: fileExt,
        size: file.size,
        folder_id: folderId || null,
        user_id: userId,
        file_path: filePath,
      },
    ])
    .select()

  if (error) {
    console.error("Error creating document record:", error)
    // Clean up the uploaded file if the record creation fails
    await supabase.storage.from("files").remove([filePath])
    return null
  }

  return data[0] as Document
}

// Get a document's download URL
export async function getDocumentUrl(filePath: string) {
  const { data } = await supabase.storage.from("files").getPublicUrl(filePath)
  return data.publicUrl
}

// Delete a document
export async function deleteDocument(id: string) {
  const userId = await getCurrentUserId()
  if (!userId) return false

  // First get the document to get the file path
  const document = await getDocument(id)
  if (!document) return false

  // Delete the file from storage
  const { error: storageError } = await supabase.storage.from("files").remove([document.file_path])

  if (storageError) {
    console.error("Error deleting file from storage:", storageError)
  }

  // Delete the record from the database
  const { error } = await supabase.from("documents").delete().eq("id", id).eq("user_id", userId)

  if (error) {
    console.error("Error deleting document record:", error)
    return false
  }

  return true
}

// ==================== SUMMARY OPERATIONS ====================

// Get all summaries for a document
export async function getSummaries(documentId: string) {
  const userId = await getCurrentUserId()
  if (!userId) return []

  // First check if the document belongs to the user
  const document = await getDocument(documentId)
  if (!document) return []

  const { data, error } = await supabase.from("summaries").select("*").eq("document_id", documentId).order("created_at")

  if (error) {
    console.error("Error fetching summaries:", error)
    return []
  }

  return data as Summary[]
}

// Create a new summary
export async function createSummary(documentId: string, content: string) {
  const userId = await getCurrentUserId()
  if (!userId) return null

  // First check if the document belongs to the user
  const document = await getDocument(documentId)
  if (!document) return null

  const { data, error } = await supabase
    .from("summaries")
    .insert([{ document_id: documentId, content }])
    .select()

  if (error) {
    console.error("Error creating summary:", error)
    return null
  }

  return data[0] as Summary
}
