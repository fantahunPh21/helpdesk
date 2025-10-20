"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { useConversations, type Message } from "@/hooks/use-conversations"
import { MessageFeedback } from "@/components/message-feedback"
import { SuggestedQuestions } from "@/components/suggested-questions"
import { ThemeToggle } from "@/components/theme-toggle"
import { TypingIndicator } from "@/components/typing-indicator"

const SUGGESTED_FOLLOW_UPS: Record<string, string[]> = {
  pricing: [
    "What payment methods do you accept?",
    "Is there a free trial available?",
    "Do you offer discounts for annual plans?",
  ],
  refund: ["What is your refund policy?", "How long does a refund take?", "Can I get a partial refund?"],
  getting_started: [
    "How do I create an account?",
    "What are the system requirements?",
    "Is there documentation available?",
  ],
}

export function ChatInterface() {
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    createConversation,
    getCurrentConversation,
    updateConversationMessages,
    updateConversationTitle,
    addFeedback,
    clearConversations,
  } = useConversations()

  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize with first conversation
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation()
    } else if (!currentConversationId) {
      setCurrentConversationId(conversations[0].id)
    }
  }, [conversations, currentConversationId, createConversation, setCurrentConversationId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const currentConversation = getCurrentConversation()
  const messages = currentConversation?.messages || []

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const generateSuggestedQuestions = (content: string) => {
    const lowerContent = content.toLowerCase()
    if (lowerContent.includes("price") || lowerContent.includes("cost")) {
      return SUGGESTED_FOLLOW_UPS.pricing
    } else if (lowerContent.includes("refund")) {
      return SUGGESTED_FOLLOW_UPS.refund
    } else if (lowerContent.includes("start") || lowerContent.includes("begin")) {
      return SUGGESTED_FOLLOW_UPS.getting_started
    }
    return []
  }

  const handleNewChat = () => {
    setSuggestedQuestions([])
    setInput("")
    createConversation()
  }

  const handleClearHistory = () => {
    setSuggestedQuestions([])
    setInput("")
    clearConversations()
  }

  const handleSendMessage = async (e: React.FormEvent, messageText?: string) => {
    e.preventDefault()
    const textToSend = messageText || input
    if (!textToSend.trim() || isLoading || !currentConversationId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
    }

    const updatedMessages = [...messages, userMessage]
    updateConversationMessages(updatedMessages)
    setInput("")
    setSuggestedQuestions([])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let assistantContent = ""
      let citations: Array<{ filename: string; section: number }> = []
      let buffer = ""

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        citations: [],
      }

      const messagesWithAssistant = [...updatedMessages, assistantMessage]
      updateConversationMessages(messagesWithAssistant)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const citationIndex = buffer.indexOf("[CITATIONS]")
        if (citationIndex >= 0) {
          const contentPart = buffer.substring(0, citationIndex)
          const citationPart = buffer.substring(citationIndex + 11)

          assistantContent += contentPart

          try {
            const citationData = JSON.parse(citationPart)
            citations = citationData.citations || []
          } catch {
            // Ignore invalid JSON
          }

          buffer = ""
        } else {
          assistantContent += buffer
          buffer = ""
        }

        updateConversationMessages(
          messagesWithAssistant.map((m) =>
            m.id === assistantMessage.id ? { ...m, content: assistantContent, citations } : m,
          ),
        )
      }

      setSuggestedQuestions(generateSuggestedQuestions(assistantContent))

      if (currentConversation?.title === "New Conversation" && messages.length === 0) {
        const title = userMessage.content.substring(0, 50)
        updateConversationTitle(currentConversationId, title)
      }
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      }
      updateConversationMessages([...updatedMessages, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="border-b border-border bg-background/80 backdrop-blur p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">HelpDesk</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleNewChat}
              className="transition-colors hover:bg-[#6fc0db] hover:text-white hover:border-[#6fc0db] dark:hover:bg-[#6fc0db] dark:hover:text-white dark:hover:border-[#6fc0db]"
            >
              New Chat
            </Button>
            <Button variant="ghost" onClick={handleClearHistory}>Clear History</Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to HelpDesk AI</h2>
                <p className="text-muted-foreground mb-6">Ask me anything about our services</p>
                <div className="space-y-2">
                  {["What are your pricing tiers?", "How do I get started?", "What is your refund policy?"].map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                      onClick={(e) => handleSendMessage(e, q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-md lg:max-w-2xl rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === "assistant" && (
                    <>
                      {message.citations && message.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                          <p className="text-xs font-semibold mb-2 opacity-75">Sources:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.citations.map((citation) => (
                              <a
                                key={`${citation.filename}-${citation.section}`}
                                href={`/api/doc?file=${encodeURIComponent(citation.filename)}&section=${citation.section}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded hover:underline"
                              >
                                {citation.filename} §{citation.section}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      <MessageFeedback
                        messageId={message.id}
                        feedback={currentConversation?.feedback?.[message.id]}
                        onFeedback={addFeedback}
                      />
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-lg p-4">
                <TypingIndicator />
              </div>
            </div>
          )}
          {!isLoading && suggestedQuestions.length > 0 && (
            <div className="flex justify-start">
              <div className="max-w-md lg:max-w-2xl">
                <SuggestedQuestions
                  questions={suggestedQuestions}
                  onSelectQuestion={(q) => handleSendMessage(new Event("submit") as any, q)}
                />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card p-4 sticky bottom-0 z-10 shadow-[0_-4px_12px_-8px_rgba(0,0,0,0.15)]">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <div className="flex items-center w-full bg-background border border-border rounded-full px-3 py-1.5 shadow-sm">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="icon"
                className="rounded-full bg-primary hover:bg-primary/90"
              >
                {isLoading ? <TypingIndicator /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
