import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  async function startLearning(formData: FormData) {
    "use server"
    const topic = formData.get("topic") as string
    if (!topic) return

    redirect(`/learn/${encodeURIComponent(topic)}`)
  }

  const suggestedTopics = ["Algebra Basics", "Calculus Derivatives", "Probability", "Geometry", "Linear Algebra"]

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Syntex</CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Learn math through AI-generated questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={startLearning} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="topic" className="text-sm font-medium text-zinc-300">
                Enter a math topic to study
              </label>
              <Input
                id="topic"
                name="topic"
                placeholder="e.g., Quadratic Equations"
                className="bg-zinc-800 border-zinc-700 text-white"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-zinc-100 text-black hover:bg-white">
              Start Learning
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <p className="text-sm text-zinc-400">Or choose a suggested topic:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedTopics.map((topic) => (
              <form key={topic} action={startLearning}>
                <input type="hidden" name="topic" value={topic} />
                <Button
                  type="submit"
                  variant="outline"
                  className="text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  {topic}
                </Button>
              </form>
            ))}
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}
