// LLM integration with streaming support
export interface Message {
  role: "user" | "assistant"
  content: string
}

export async function* streamLLMResponse(messages: Message[], context: string): AsyncGenerator<string> {
  // System prompt with RAG context
  const systemPrompt = `You are a helpful HelpDesk AI assistant. You answer questions based on the provided knowledge base.

If the user's question is not covered by the knowledge base, politely say you don't have enough information and suggest relevant documentation.

Always be concise and helpful. Format your response in clear, readable paragraphs.

Knowledge Base Context:
${context || "No relevant information found in the knowledge base."}`

  const requestBody = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    stream: true,
    temperature: 0.7,
    max_tokens: 500,
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error("No response body")

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              yield content
            }
          } catch {
            // Ignore invalid JSON chunks and continue streaming
          }
        }
      }
    }
  } catch (error) {
    console.error("LLM streaming error:", error)
    // Fallback mock response if API fails
    yield "I apologize, but I encountered an issue retrieving information. "
    yield "Please try again or contact support@helpdesk.ai for assistance."
  }
}

// Mock LLM for development/testing
export async function* mockLLMResponse(messages: Message[], context: string): AsyncGenerator<string> {
  const lastMessage = messages.at(-1)?.content || ""

  let response = ""

  if (lastMessage.toLowerCase().includes("pricing") || lastMessage.toLowerCase().includes("price") || lastMessage.toLowerCase().includes("plan")) {
    response =
      "We offer three pricing tiers: Starter ($29/month), Professional ($99/month), and Enterprise (custom pricing). Each tier includes different features and support levels. Would you like more details about any specific plan?"
  } else if (lastMessage.toLowerCase().includes("refund")) {
    response =
      "We offer a 30-day money-back guarantee for all new customers. After that, refunds are handled on a case-by-case basis. You can contact our support team at support@helpdesk.ai to discuss your situation."
  } else if (lastMessage.toLowerCase().includes("ship") || lastMessage.toLowerCase().includes("hardware") || lastMessage.toLowerCase().includes("device")) {
    response =
      "I don't have information about shipping hardware devices in our current knowledge base. This topic isn't covered in our documentation. Please check our getting-started guide or contact support@helpdesk.ai for assistance with hardware-related questions."
  } else if (lastMessage.toLowerCase().includes("api") || lastMessage.toLowerCase().includes("key")) {
    response =
      'To get your API key, go to Settings > API Keys and click "Generate New Key". Store it securely as you\'ll need it for integrations. Check our getting-started guide for more details.'
  } else {
    // Guardrail: if no relevant context, refuse confidently and suggest docs
    if (!context || context.trim().length === 0 || context.includes("No relevant information")) {
      response =
        "I apologize, but I encountered an issue retrieving information. Please try again or contact support@helpdesk.ai for assistance."
    } else {
      response =
        "Based on our knowledge base, here's what I can share. If this doesn't address your question, please refer to the provided sources below."
    }
  }

  // Simulate streaming by yielding character by character
  for (const char of response) {
    yield char
    // Small delay to simulate streaming
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}
