"use client"

import { useState, useCallback, memo, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Trash2 } from "lucide-react"
import { getTopics, deleteTopic } from "@/lib/db-service"
import type { Topic } from "@/lib/supabase"

interface TopicListProps {
  folderId?: string
}

export const TopicList = memo(function TopicList({ folderId }: TopicListProps) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTopics() {
      try {
        setLoading(true)
        const data = await getTopics(folderId)
        setTopics(data)
        setError(null)
      } catch (err) {
        console.error("Error loading topics:", err)
        setError("Failed to load topics")
      } finally {
        setLoading(false)
      }
    }

    loadTopics()
  }, [folderId])

  const removeTopic = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this topic?")) return

    try {
      const success = await deleteTopic(id)
      if (success) {
        setTopics((prevTopics) => prevTopics.filter((topic) => topic.id !== id))
      }
    } catch (err) {
      console.error("Error deleting topic:", err)
      alert("Failed to delete topic")
    }
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-400">
        Loading topics...
      </div>
    )
  }

  if (error) {
    return <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-400">{error}</div>
  }

  if (topics.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-400">
        No topics saved yet. Add a topic to get started.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {topics.map((topic) => (
        <TopicItem key={topic.id} topic={topic} onRemove={removeTopic} />
      ))}
    </div>
  )
})

// Extract topic item to its own component for better performance
const TopicItem = memo(function TopicItem({
  topic,
  onRemove,
}: {
  topic: Topic
  onRemove: (id: string) => void
}) {
  const topicUrl = `/math/learn/${encodeURIComponent(topic.name)}?difficulty=${topic.difficulty}&language=en&topicId=${topic.id}`;
  
  return (
    <div className="relative group">
      {/* Make the entire topic card clickable */}
      <Link href={topicUrl} className="block">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col hover:bg-zinc-800 transition-colors cursor-pointer">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-medium text-white group-hover:text-white transition-colors">{topic.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">{topic.difficulty}</span>
                <span className="text-xs text-zinc-400">{topic.progress}% complete</span>
              </div>
            </div>
            {/* Delete button with higher z-index so it works properly */}
            <div className="relative z-10">
              <button
                className="text-zinc-400 hover:text-red-400 p-1 rounded-full hover:bg-zinc-700"
                onClick={(e) => {
                  e.preventDefault(); // Prevent navigation
                  e.stopPropagation(); // Stop event bubbling
                  onRemove(topic.id);
                }}
                aria-label={`Remove ${topic.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-zinc-800 h-1.5 rounded-full mt-auto">
            <div
              className="bg-zinc-400 h-1.5 rounded-full"
              style={{ width: `${topic.progress}%` }}
              role="progressbar"
              aria-valuenow={topic.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className="mt-4 text-right">
            <span className="inline-flex items-center text-zinc-400 group-hover:text-white px-2 py-1 rounded group-hover:bg-zinc-700 transition-colors">
              Continue
              <ArrowRight className="ml-1 h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
})
