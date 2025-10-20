"use client"

import { Button } from "@/components/ui/button"
import { Lightbulb } from "lucide-react"

interface SuggestedQuestionsProps {
  questions: string[]
  onSelectQuestion: (question: string) => void
}

export function SuggestedQuestions({ questions, onSelectQuestion }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Lightbulb className="w-4 h-4" />
        Suggested follow-ups:
      </div>
      <div className="space-y-2">
        {questions.map((question, idx) => (
          <Button
            key={idx}
            variant="outline"
            className="w-full justify-start text-left h-auto py-2 px-3 bg-transparent"
            onClick={() => onSelectQuestion(question)}
          >
            <span className="text-sm">{question}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
