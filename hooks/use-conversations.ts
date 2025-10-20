"use client"

import { useState, useEffect } from "react"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Array<{ filename: string; section: number }>
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  feedback?: Record<string, "helpful" | "unhelpful">
}

const STORAGE_KEY = "helpdesk_conversations"

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

  // Load conversations from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setConversations(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to load conversations:", e)
      }
    }
  }, [])

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
    }
  }, [conversations])

  const createConversation = (title = "New Conversation") => {
    const id = Date.now().toString()
    const newConversation: Conversation = {
      id,
      title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      feedback: {},
    }
    setConversations((prev) => [newConversation, ...prev])
    setCurrentConversationId(id)
    return id
  }

  const getCurrentConversation = () => {
    return conversations.find((c) => c.id === currentConversationId)
  }

  const updateConversationMessages = (messages: Message[]) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === currentConversationId ? { ...c, messages, updatedAt: Date.now() } : c)),
    )
  }

  const updateConversationTitle = (id: string, title: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)))
  }

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (currentConversationId === id) {
      setCurrentConversationId(null)
    }
  }

  const addFeedback = (messageId: string, feedback: "helpful" | "unhelpful") => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversationId
          ? {
              ...c,
              feedback: { ...c.feedback, [messageId]: feedback },
              updatedAt: Date.now(),
            }
          : c,
      ),
    )
  }

  return {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    createConversation,
    getCurrentConversation,
    updateConversationMessages,
    updateConversationTitle,
    deleteConversation,
    addFeedback,
    clearConversations: () => {
      setConversations([])
      setCurrentConversationId(null)
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore storage errors
      }
    },
  }
}
