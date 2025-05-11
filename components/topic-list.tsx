"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Trash2 } from "lucide-react"

// In a real app, this would come from a database
const initialTopics = [
  { id: "1", name: "Algebra Basics", difficulty: "easy", progress: 60 },
  { id: "2", name: "Calculus Derivatives", difficulty: "medium", progress: 30 },
  { id: "3", name: "Probability", difficulty: "medium", progress: 45 },
  { id: "4", name: "Geometry", difficulty: "easy", progress: 80 },
]

export function TopicList() {
  const [topics, setTopics] = useState(initialTopics)

  const removeTopic = (id: string) => {
    setTopics(topics.filter((topic) => topic.id !== id))
  }

  if (topics.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 p-6 text-center text-zinc-400">
        No topics saved yet. Add a topic to get started.
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {topics.map((topic) => (
        <Card key={topic.id} className="bg-zinc-900 border-zinc-800 p-4 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-medium text-white">{topic.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    topic.difficulty === "easy" ? "outline" : topic.difficulty === "medium" ? "secondary" : "default"
                  }
                >
                  {topic.difficulty}
                </Badge>
                <span className="text-xs text-zinc-400">{topic.progress}% complete</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
              onClick={() => removeTopic(topic.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="bg-zinc-800 h-1.5 rounded-full mt-auto">
            <div className="bg-zinc-400 h-1.5 rounded-full" style={{ width: `${topic.progress}%` }} />
          </div>

          <div className="mt-4 text-right">
            <Link href={`/math/learn/${encodeURIComponent(topic.name)}?difficulty=${topic.difficulty}&language=en`}>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                Continue
                <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  )
}
