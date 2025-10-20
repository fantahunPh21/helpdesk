"use client"

import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown } from "lucide-react"

interface MessageFeedbackProps {
  messageId: string
  feedback?: "helpful" | "unhelpful"
  onFeedback: (messageId: string, feedback: "helpful" | "unhelpful") => void
}

export function MessageFeedback({ messageId, feedback, onFeedback }: MessageFeedbackProps) {
  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-current border-opacity-20">
      <span className="text-xs text-muted-foreground">Was this helpful?</span>
      <Button
        variant="ghost"
        size="icon"
        className={`h-6 w-6 ${feedback === "helpful" ? "text-green-600" : ""}`}
        onClick={() => onFeedback(messageId, "helpful")}
      >
        <ThumbsUp className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-6 w-6 ${feedback === "unhelpful" ? "text-red-600" : ""}`}
        onClick={() => onFeedback(messageId, "unhelpful")}
      >
        <ThumbsDown className="w-3 h-3" />
      </Button>
    </div>
  )
}
