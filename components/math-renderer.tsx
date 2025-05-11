"use client"

import { useEffect, useRef } from "react"

interface MathRendererProps {
  content: string
}

export function MathRenderer({ content }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && containerRef.current) {
      // Dynamically import KaTeX
      import("katex").then((katex) => {
        // KaTeX CSS is already imported globally

        // Process and render the math content
        const processedContent = content
          .replace(/\$\$(.*?)\$\$/g, (match, formula) => {
            const span = document.createElement("span")
            katex.default.render(formula, span, {
              throwOnError: false,
              displayMode: true,
            })
            return span.outerHTML
          })
          .replace(/\$(.*?)\$/g, (match, formula) => {
            const span = document.createElement("span")
            katex.default.render(formula, span, {
              throwOnError: false,
              displayMode: false,
            })
            return span.outerHTML
          })

        if (containerRef.current) {
          containerRef.current.innerHTML = processedContent
        }
      })
    }
  }, [content])

  return <div ref={containerRef} className="math-content" />
}
