# HelpDesk AI

A small helpdesk chatbot that answers questions from a tiny markdown knowledge base. It streams replies, cites the sources it used, and keeps the setup simple.

## Features

- **Streaming Chat Interface** - Real-time responses as they're generated
- **RAG Retrieval** - Intelligent document retrieval using BM25-inspired scoring
- **Source Citations** - Automatic citations showing which documents were used
- **Clickable Sources** - Tap a citation to open the exact section via `/api/doc`
- **Knowledge Base** - Markdown-based documentation system
- **Mock LLM Support** - Works without API keys for development

## Getting Started

### Install

bash\`\`\`
npm install
\`\`\`

### Environment Variables

Create a `.env.local` file (optional):

\`\`\`
OPENAI_API_KEY=your_api_key_here
\`\`\`

If no API key is provided, the app uses a mock LLM.

### Run

bash\`\`\`
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000).

## How it works

 ### Retriever (`lib/retriever.ts`)

- Loads markdown documents from `/data` directory
- Implements BM25-inspired keyword scoring
- Returns top-k relevant snippets with source metadata
- Formats context for LLM consumption

 ### LLM (`lib/llm.ts`)

- Supports streaming responses from OpenAI API
- Falls back to mock responses for development
- Refuses out-of-scope questions when no relevant context is retrieved
- Includes system prompt with RAG context
- Handles streaming token parsing

 ### Chat API (`app/api/chat/route.ts`)

- POST endpoint accepting message history
- Performs retrieval on latest user message
- Streams response with citations
- Returns structured citation data

 ### Docs API (`app/api/doc/route.ts`)

- `GET /api/doc?file=pricing.md&section=1` returns the file (or a specific paragraph)
- Used by the UI to open citation chips in a new tab

 ### UI (`components/chat-interface.tsx`)

- Real-time message streaming
- User and assistant message bubbles
- Citation display with source references
- Loading states and error handling

## Knowledge Base

Add markdown files to the `/data` directory:

- `pricing.md` - Pricing information
- `refunds.md` - Refund policy
- `getting-started.md` - Getting started guide

## Try it

Try these sample questions:

- "What are the pricing tiers and what's included?"
- "How do I get an API key to start?"
- "Can I get a refund after 20 days?"
- "Do you ship hardware devices?"

## Notes

**Retrieval**: Simple keyword scoring (BM25‑style). Easy to swap for embeddings later.

**Streaming**: Token-by-token via ReadableStream.

**Citations**: Sent at the end of the stream as a JSON marker. The UI renders clickable chips.

**Mock LLM**: Full flow runs without keys.

Add your `OPENAI_API_KEY` to environment variables.

