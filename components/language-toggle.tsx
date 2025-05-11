"use client"

import { useLanguage } from "@/contexts/language-context"
import { useCallback, useEffect, memo } from "react"

// Memoize the component to prevent unnecessary re-renders
export const LanguageToggle = memo(function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  // Memoize the language change handlers
  const setEnglish = useCallback(() => setLanguage("en"), [setLanguage])
  const setSpanish = useCallback(() => setLanguage("es"), [setLanguage])

  // Update hidden input when language changes
  useEffect(() => {
    const inputs = document.querySelectorAll('input[name="language"]')
    inputs.forEach((input: HTMLInputElement) => {
      input.value = language
    })
  }, [language])

  return (
    <div className="flex space-x-1">
      <button
        onClick={setEnglish}
        className={`px-2 py-1 text-xs rounded ${
          language === "en"
            ? "bg-zinc-100 text-black"
            : "bg-transparent border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        }`}
      >
        EN
      </button>
      <button
        onClick={setSpanish}
        className={`px-2 py-1 text-xs rounded ${
          language === "es"
            ? "bg-zinc-100 text-black"
            : "bg-transparent border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        }`}
      >
        ES
      </button>
    </div>
  )
})
