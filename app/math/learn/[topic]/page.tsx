"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { generateQuestion } from "@/lib/generate-question"
import { MathRenderer } from "@/components/math-renderer"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Lightbulb, SkipForward, Plus, Minus, RefreshCw } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { LanguageToggle } from "@/components/language-toggle"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateTopic } from "@/lib/db-service"

export default function LearnPage({ params }: { params: { topic: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const topic = decodeURIComponent(params.topic)
  const [difficulty, setDifficulty] = useState(() => {
    const diffParam = searchParams.get("difficulty")
    // Ensure we have a valid number between 1-10
    if (diffParam) {
      const parsed = parseInt(diffParam)
      return !isNaN(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 5
    }
    return 5 // Default difficulty
  })
  const urlLanguage = searchParams.get("language") || "en"
  const source = searchParams.get("source") || "topic"
  const topicId = searchParams.get("topicId")

  const { language, setLanguage, t } = useLanguage()

  // Set language from URL parameter
  useEffect(() => {
    if (urlLanguage === "en" || urlLanguage === "es") {
      setLanguage(urlLanguage)
    }
  }, [urlLanguage, setLanguage])

  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState<{
    question: string
    options: string[]
    correctIndex: number
    hint: string
  } | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [questionCount, setQuestionCount] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [skippedQuestions, setSkippedQuestions] = useState(0)
  const [updatingProgress, setUpdatingProgress] = useState(false)

  useEffect(() => {
    loadNewQuestion()
  }, [language])

  async function loadNewQuestion(difficultyLevel = difficulty) {
    setLoading(true)
    setSelectedOption(null)
    setIsCorrect(null)
    setShowHint(false)

    try {
      // In a real app, if source is 'pdf', you would fetch the PDF content here
      const pdfContent = source === "pdf" ? "This is simulated PDF content about " + topic : undefined

      // Pass the numeric difficulty level directly to affect the prompt complexity
      // The generateQuestion function will use this value (1-10) to adjust the complexity
      const newQuestion = await generateQuestion(topic, difficultyLevel.toString(), language, pdfContent)
      setQuestion(newQuestion)
      setQuestionCount((prev) => prev + 1)
    } catch (error) {
      console.error("Failed to generate question:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleOptionSelect(index: number) {
    if (selectedOption !== null) return // Prevent changing answer

    setSelectedOption(index)
    const correct = index === question?.correctIndex
    setIsCorrect(correct)

    if (correct) {
      setScore((prev) => prev + 1)
    }

    // Update progress in the database if we have a topicId
    if (topicId) {
      try {
        setUpdatingProgress(true)
        const attemptedQuestions = questionCount - skippedQuestions
        const newProgress = Math.round((score / attemptedQuestions) * 100)

        await updateTopic(topicId, { progress: newProgress })
      } catch (error) {
        console.error("Failed to update progress:", error)
      } finally {
        setUpdatingProgress(false)
      }
    }
  }

  function handleNextQuestion() {
    loadNewQuestion()
  }

  function handleSkipQuestion() {
    setSkippedQuestions((prev) => prev + 1)
    loadNewQuestion()
  }

  function goBack() {
    // If we have a topicId, extract the folder ID correctly
    if (topicId) {
      // The topicId format is "folderId-topicId", so we need to extract the folderId part
      const folderId = topicId.split("-")[0];
      // Navigate to the correct folder page
      router.push(`/math/folder/${folderId}`);
    } else {
      // If no topicId, go back to the main math page
      router.push("/math");
    }
  }

  // Function to just change difficulty without loading a new question
  const handleDifficultyChange = (newDifficulty: number) => {
    setDifficulty(newDifficulty)
    // Just update the difficulty, don't load a new question
    // The user will need to click reload to see a question at the new difficulty
  }

  // Function to increase difficulty
  const increaseDifficulty = () => {
    if (difficulty < 10) handleDifficultyChange(difficulty + 1)
  }

  // Function to decrease difficulty
  const decreaseDifficulty = () => {
    if (difficulty > 1) handleDifficultyChange(difficulty - 1)
  }
  
  // Get the display text for current difficulty level
  const getDifficultyText = () => {
    return `Level: ${difficulty}`
  }

  const attemptedQuestions = questionCount - (selectedOption === null ? 1 : 0) - skippedQuestions
  const scorePercentage = attemptedQuestions > 0 ? (score / attemptedQuestions) * 100 : 0

  return (
    <div className="container py-8 flex justify-center">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">
              {topic}
              {source === "pdf" && <span className="ml-2 text-xs bg-zinc-800 px-2 py-0.5 rounded-full">PDF</span>}
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-zinc-800 rounded-md px-2 py-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={decreaseDifficulty} 
                  disabled={difficulty === 1}
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-sm px-1 min-w-[80px] text-center">{getDifficultyText()}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={increaseDifficulty} 
                  disabled={difficulty === 10}
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadNewQuestion(difficulty)}
                disabled={loading}
                className="h-8 w-8 text-zinc-400 hover:text-white border-zinc-700 hover:bg-zinc-800"
                title={t("button.reload")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm text-zinc-400">
            <span>
              {t("difficulty.label")}: Level {difficulty}
            </span>
            <span>
              {t("question.score")}: {score}/{attemptedQuestions}
            </span>
          </div>

          <Progress value={scorePercentage} className="h-1 bg-zinc-800" />
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="py-8 text-center text-zinc-400">{t("generating")}</div>
          ) : (
            <>
              <div className="p-4 bg-zinc-800 rounded-lg">
                <MathRenderer content={question?.question || ""} />
              </div>

              {showHint && question?.hint && (
                <Alert className="bg-zinc-800 border-amber-600/50">
                  <AlertDescription className="text-amber-200">
                    <Lightbulb className="h-4 w-4 inline-block mr-2" />
                    {question.hint}
                  </AlertDescription>
                </Alert>
              )}

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

        <CardFooter className="flex flex-wrap gap-2 justify-between">
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("button.back")}
          </Button>

          <div className="flex gap-2">
            {!loading && selectedOption === null && (
              <>
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => setShowHint(true)}
                  disabled={showHint}
                >
                  <Lightbulb className="mr-2 h-4 w-4" />
                  {t("button.hint")}
                </Button>

                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={handleSkipQuestion}
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  {t("button.skip")}
                </Button>
              </>
            )}

            {selectedOption !== null && (
              <Button
                onClick={handleNextQuestion}
                className="bg-zinc-100 text-black hover:bg-white"
                disabled={updatingProgress}
              >
                {updatingProgress ? "Updating..." : t("button.next")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
