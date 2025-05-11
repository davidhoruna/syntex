"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createTopic } from "@/lib/db-service"

export default function TopicsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const folderId = searchParams.get("folder")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      setError(null)

      const formData = new FormData(e.currentTarget)
      const topic = formData.get("topic") as string
      const difficulty = (formData.get("difficulty") as "easy" | "medium" | "hard") || "medium"
      const language = (formData.get("language") as string) || "en"

      if (!topic) {
        setError("Topic name is required")
        return
      }

      if (!folderId) {
        setError("Folder ID is required")
        return
      }

      // Create the topic in the database
      const newTopic = await createTopic(topic, difficulty, folderId)

      if (!newTopic) {
        setError("Failed to create topic")
        return
      }

      // Redirect to the learn page
      router.push(
        `/math/learn/${encodeURIComponent(topic)}?difficulty=${difficulty}&language=${language}&topicId=${newTopic.id}`,
      )
    } catch (err) {
      console.error("Error creating topic:", err)
      setError("An error occurred while creating the topic")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link
            href={folderId ? `/math/folder/${folderId}` : "/math"}
            className="inline-flex items-center text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h1 className="text-xl font-bold mb-4">Add New Topic</h1>

          {error && <div className="bg-red-900/20 border border-red-800 text-red-200 p-3 rounded mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="topic" className="text-sm font-medium text-zinc-300">
                Enter a math topic to study
              </label>
              <input
                id="topic"
                name="topic"
                placeholder="e.g., Quadratic Equations"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Difficulty</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input type="radio" name="difficulty" value="easy" className="mr-1.5" />
                  <span className="text-sm text-zinc-300">Easy</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="difficulty" value="medium" defaultChecked className="mr-1.5" />
                  <span className="text-sm text-zinc-300">Medium</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="difficulty" value="hard" className="mr-1.5" />
                  <span className="text-sm text-zinc-300">Hard</span>
                </label>
              </div>
            </div>

            <input type="hidden" name="language" id="language" value="en" />
            {folderId && <input type="hidden" name="folder" value={folderId} />}

            <button
              type="submit"
              className="w-full py-2 bg-zinc-100 text-black rounded-md hover:bg-white disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Start Learning"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
