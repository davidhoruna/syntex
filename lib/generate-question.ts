"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Helper function that attempts to robustly sanitize the JSON string
function robustSanitizeJson(input: string): string {
  let sanitized = input
  // Initial regex: escape backslashes that are not followed by a valid escape character
  sanitized = sanitized.replace(/\\(?!["\\/bfnrt])/g, "\\\\")
  console.debug("After initial sanitization:", sanitized)

  try {
    JSON.parse(sanitized)
    return sanitized
  } catch (firstError: any) {
    console.warn("Initial sanitization failed:", firstError.message)
    // Collapse multiple backslashes to two (this may help if over-escaped)
    sanitized = sanitized.replace(/\\\\+/g, "\\\\")
    console.debug("After collapsing multiple backslashes:", sanitized)

    try {
      JSON.parse(sanitized)
      return sanitized
    } catch (secondError: any) {
      console.error("Second sanitization attempt failed:", secondError.message)
      // Iteratively re-apply the regex a few times as a last attempt
      for (let i = 0; i < 3; i++) {
        sanitized = sanitized.replace(/\\(?!["\\/bfnrt])/g, "\\\\")
        console.debug(`After iterative sanitization pass ${i + 1}:`, sanitized)
        try {
          JSON.parse(sanitized)
          return sanitized
        } catch (iterError: any) {
          console.warn(`Pass ${i + 1} still failing:`, iterError.message)
        }
      }
      console.error("Robust sanitization failed. Final sanitized JSON:", sanitized)
      return sanitized // Let the caller handle the parsing error
    }
  }
}

export async function generateQuestion(topic: string, difficulty = "5", language = "en", pdfContent?: string) {
  try {
    const contextPrompt = pdfContent
      ? `Use the following PDF content as context for generating a question:
         ${pdfContent.substring(0, 2000)}...`
      : ""

    const languagePrompt =
      language === "es" ? "Genera la pregunta y opciones en español." : "Generate the question and options in English."

    // Convert numeric difficulty (1-10) to a descriptive text
    const difficultyLevel = parseInt(difficulty) || 5
    let difficultyDescription = "moderately challenging for intermediate students"
    
    if (difficultyLevel <= 2) {
      difficultyDescription = "very simple and basic for complete beginners"
    } else if (difficultyLevel <= 4) {
      difficultyDescription = "simple and straightforward for beginners"
    } else if (difficultyLevel <= 6) {
      difficultyDescription = "moderately challenging for intermediate students"
    } else if (difficultyLevel <= 8) {
      difficultyDescription = "challenging for advanced students"
    } else {
      difficultyDescription = "very challenging and complex for expert-level students"
    }

    const prompt = `
Generate a multiple-choice math question about ${topic} with a difficulty level of ${difficulty} out of 10.
The question should be ${difficultyDescription}.
${languagePrompt}
${contextPrompt}

Format your response as a valid JSON object with the following structure:
{
  "question": "The question text with LaTeX math expressions enclosed in $ or $$ delimiters",
  "options": ["Option A with LaTeX if needed", "Option B with LaTeX if needed", "Option C with LaTeX if needed", "Option D with LaTeX if needed"],
  "correctIndex": 0, // Index of the correct answer (0-3)
  "hint": "A helpful hint that gives a clue without revealing the answer"
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

    // Debug: Log the original JSON text
    console.debug("Original JSON text:", jsonText)

    // Apply robust sanitization before parsing
    const safeJsonText = robustSanitizeJson(jsonText)

    // Debug: Log the final safe JSON text
    console.debug("Final Safe JSON text:", safeJsonText)

    const questionData = JSON.parse(safeJsonText)
    return questionData
  } catch (error) {
    console.error("Error generating question:", error)
    // Return a fallback question if generation fails
    return {
      question: "If $f(x) = x^2 + 3x + 2$, what is $f(2)$?",
      options: ["$8$", "$10$", "$12$", "$14$"],
      correctIndex: 1,
      hint: "Substitute x = 2 into the function and evaluate.",
    }
  }
}
