"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { generateQuestion } from "@/lib/generate-question"
import { MathRenderer } from "@/components/math-renderer"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Home, Lightbulb, SkipForward } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { LanguageToggle } from "@/components/language-toggle"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LearnPage({ params }: { params: { topic: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const topic = decodeURIComponent(params.topic)
  const difficulty = searchParams.get("difficulty") || "medium"
  const urlLanguage = searchParams.get("language") || "en"

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

  useEffect(() => {
    loadNewQuestion()
  }, [language])

  async function loadNewQuestion() {
    setLoading(true)
    setSelectedOption(null)
    setIsCorrect(null)
    setShowHint(false)

    try {
      const newQuestion = await generateQuestion(topic, difficulty, language)
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

  function handleSkipQuestion() {
    setSkippedQuestions((prev) => prev + 1)
    loadNewQuestion()
  }

  function goHome() {
    router.push("/")
  }

  const attemptedQuestions = questionCount - (selectedOption === null ? 1 : 0) - skippedQuestions
  const scorePercentage = attemptedQuestions > 0 ? (score / attemptedQuestions) * 100 : 0

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
            <LanguageToggle />
          </div>

          <div className="flex justify-between items-center text-sm text-zinc-400">
            <span>
              {t("difficulty.label")}: {t(`difficulty.${difficulty}`)}
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
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={goHome}>
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
              <Button onClick={handleNextQuestion} className="bg-zinc-100 text-black hover:bg-white">
                {t("button.next")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}
