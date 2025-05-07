"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { generateQuestion } from "@/lib/generate-question"
import { MathRenderer } from "@/components/math-renderer"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Home } from "lucide-react"
import React from "react"
export default function LearnPage({ params }: { params: { topic: string } }) {
  const router = useRouter()
  
  const unwrappedParams = React.use(params)
  const topic = decodeURIComponent(unwrappedParams.topic)

  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState<{
    question: string
    options: string[]
    correctIndex: number
  } | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [questionCount, setQuestionCount] = useState(0)

  useEffect(() => {
    loadNewQuestion()
  }, [])

  async function loadNewQuestion() {
    setLoading(true)
    setSelectedOption(null)
    setIsCorrect(null)

    try {
      const newQuestion = await generateQuestion(topic)
      setQuestion(newQuestion)
      setQuestionCount((prev) => prev + 1)
    } catch (error) {
      console.error("Failed to generate question:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleOptionSelect(index: number) {
    if (selectedOption !== null) return // Prevent changing answer

    setSelectedOption(index)
    const correct = index === question?.correctIndex
    setIsCorrect(correct)

    if (correct) {
      setScore((prev) => prev + 1)
    }
  }

  function handleNextQuestion() {
    loadNewQuestion()
  }

  function goHome() {
    router.push("/")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800">
        <CardHeader className="space-y-4">
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={goHome}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Home className="h-5 w-5" />
            </Button>
            <CardTitle className="text-xl font-medium text-center">{topic}</CardTitle>
            <div className="w-9" /> {/* Spacer for alignment */}
          </div>

          <div className="flex justify-between items-center text-sm text-zinc-400">
            <span>Question {questionCount}</span>
            <span>
              Score: {score}/{questionCount - (selectedOption === null ? 1 : 0)}
            </span>
          </div>

          <Progress
            value={(score / Math.max(1, questionCount - (selectedOption === null ? 1 : 0))) * 100}
            className="h-1 bg-zinc-800"
          />
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="py-8 text-center text-zinc-400">Generating question...</div>
          ) : (
            <>
              <div className="p-4 bg-zinc-800 rounded-lg">
                <MathRenderer content={question?.question || ""} />
              </div>

              <div className="space-y-3">
                {question?.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className={`w-full justify-start p-4 h-auto text-left border-zinc-700 hover:bg-zinc-800 
                      ${selectedOption === index && isCorrect ? "bg-green-900/20 border-green-700" : ""}
                      ${selectedOption === index && !isCorrect ? "bg-red-900/20 border-red-700" : ""}
                      ${selectedOption !== index && index === question.correctIndex && selectedOption !== null ? "bg-green-900/20 border-green-700" : ""}
                    `}
                    onClick={() => handleOptionSelect(index)}
                  >
                    <div className="mr-2">{String.fromCharCode(65 + index)}.</div>
                    <MathRenderer content={option} />
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={goHome}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Topics
          </Button>

          {selectedOption !== null && (
            <Button onClick={handleNextQuestion} className="bg-zinc-100 text-black hover:bg-white">
              Next Question
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </main>
  )
}
