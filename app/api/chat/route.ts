import { type NextRequest, NextResponse } from "next/server"
import { retrieveRelevantSnippets, formatContextForLLM, extractCitations } from "@/lib/retriever"
import { streamLLMResponse, mockLLMResponse } from "@/lib/llm"

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 })
    }

    // Get the last user message for retrieval
    const lastUserMessage = messages[messages.length - 1]
    if (lastUserMessage.role !== "user") {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 })
    }

    // Retrieve relevant snippets
    const snippets = await retrieveRelevantSnippets(lastUserMessage.content, 3)
    const context = formatContextForLLM(snippets)
    const citations = extractCitations(snippets)

    // Create a readable stream for streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use mock LLM if no API key is set
          const useMock = !process.env.OPENAI_API_KEY
          const generator = useMock ? mockLLMResponse(messages, context) : streamLLMResponse(messages, context)

          for await (const chunk of generator) {
            controller.enqueue(new TextEncoder().encode(chunk))
          }

          // Send citations at the end
          const citationData = JSON.stringify({ citations })
          controller.enqueue(new TextEncoder().encode(`\n[CITATIONS]${citationData}`))

          controller.close()
        } catch (error) {
          console.error("Stream error:", error)
          controller.error(error)
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
