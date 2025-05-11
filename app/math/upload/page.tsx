"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload } from "lucide-react"
import Link from "next/link"

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [topic, setTopic] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      // Extract a topic name from the file name
      const fileName = e.target.files[0].name.replace(/\.[^/.]+$/, "")
      setTopic(fileName)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !topic) return

    setUploading(true)

    // In a real app, you would upload the file to a server here
    // For now, we'll just simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Redirect to the learn page with the topic
    router.push(`/math/learn/${encodeURIComponent(topic)}?source=pdf&difficulty=medium&language=en`)
  }

  return (
    <div className="container py-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link href="/math">
            <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Topics
            </Button>
          </Link>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription className="text-zinc-400">
              Upload a PDF to generate math questions from its content
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pdf-upload" className="text-sm font-medium text-zinc-300">
                  Select PDF
                </Label>
                <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-zinc-500 transition-colors">
                  <Input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                  <label htmlFor="pdf-upload" className="flex flex-col items-center justify-center cursor-pointer">
                    <Upload className="h-8 w-8 text-zinc-400 mb-2" />
                    <span className="text-sm text-zinc-400">{file ? file.name : "Click to select a PDF file"}</span>
                    {file && (
                      <span className="text-xs text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic" className="text-sm font-medium text-zinc-300">
                  Topic Name
                </Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Linear Algebra Lecture 1"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full bg-zinc-100 text-black hover:bg-white"
                disabled={!file || !topic || uploading}
              >
                {uploading ? "Processing..." : "Generate Questions"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
