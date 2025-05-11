"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type Language = "en" | "es"

type LanguageContextType = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    "app.title": "Syntex",
    "app.description": "Learn math through AI-generated questions",
    "topic.label": "Enter a math topic to study",
    "topic.placeholder": "e.g., Quadratic Equations",
    "button.start": "Start Learning",
    "or.choose": "Or choose a suggested topic:",
    "question.score": "Score",
    "button.hint": "Show Hint",
    "button.skip": "Skip Question",
    "button.next": "Next Question",
    "button.back": "Back to Topics",
    "difficulty.easy": "Easy",
    "difficulty.medium": "Medium",
    "difficulty.hard": "Hard",
    "difficulty.label": "Difficulty",
    generating: "Generating question...",
  },
  es: {
    "app.title": "Syntex",
    "app.description": "Aprende matemáticas con preguntas generadas por IA",
    "topic.label": "Ingresa un tema de matemáticas para estudiar",
    "topic.placeholder": "ej., Ecuaciones Cuadráticas",
    "button.start": "Comenzar a Aprender",
    "or.choose": "O elige un tema sugerido:",
    "question.score": "Puntuación",
    "button.hint": "Mostrar Pista",
    "button.skip": "Saltar Pregunta",
    "button.next": "Siguiente Pregunta",
    "button.back": "Volver a Temas",
    "difficulty.easy": "Fácil",
    "difficulty.medium": "Medio",
    "difficulty.hard": "Difícil",
    "difficulty.label": "Dificultad",
    generating: "Generando pregunta...",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
