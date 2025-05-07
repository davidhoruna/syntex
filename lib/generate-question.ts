"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function generateQuestion(topic: string) {
  try {
    const prompt = `
Generate a multiple-choice math question about ${topic}.
The question should be challenging but appropriate for a student learning this topic.

Format your response as a valid JSON object with the following structure:
{
  "question": "The question text with LaTeX math expressions enclosed in $ or $$ delimiters",
  "options": ["Option A with LaTeX if needed", "Option B with LaTeX if needed", "Option C with LaTeX if needed", "Option D with LaTeX if needed"],
  "correctIndex": 0 // Index of the correct answer (0-3)
}

Make sure all mathematical expressions are properly formatted with LaTeX syntax.
For inline math, use single $ delimiters.
For display math, use double $$ delimiters.
Ensure the JSON is valid and can be parsed.
`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.7,
      maxTokens: 1000,
    })

    // Extract JSON from the response (handling cases where it's wrapped in markdown code blocks)
    let jsonText = text

    // Check if the response is wrapped in a code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch && codeBlockMatch[1]) {
      jsonText = codeBlockMatch[1].trim()
    }

    // Sanitize JSON by escaping backslashes that could cause issues
    const safeJsonText = jsonText.replace(/\\(?!["\\\/bfnrt])/g, '\\\\');
    const questionData = JSON.parse(safeJsonText)
    return questionData
  } catch (error) {
    console.error("Error generating question:", error)
    // Return a fallback question if generation fails
    return {
      question: "If $f(x) = x^2 + 3x + 2$, what is $f(2)$?",
      options: ["$8$", "$10$", "$12$", "$14$"],
      correctIndex: 1,
    }
  }
}
