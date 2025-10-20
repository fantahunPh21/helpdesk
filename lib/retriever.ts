// Simple BM25-inspired keyword retrieval system
interface Document {
  id: string
  filename: string
  content: string
  paragraphs: string[]
}

interface RetrievalResult {
  filename: string
  paragraphIndex: number
  content: string
  score: number
}

// Load and parse markdown documents from local filesystem (server-side only)
let cachedDocuments: Document[] | null = null
let cachedMtimeMs: number | null = null

export async function loadDocuments(): Promise<Document[]> {
  // Ensure this runs server-side
  if (globalThis.window !== undefined) {
    // Client should not attempt to read files; return empty so server handles retrieval
    return []
  }

  const fs = await import("node:fs/promises")
  const path = await import("node:path")

  const dataDir = path.join(process.cwd(), "data")

  try {
    const stat = await fs.stat(dataDir)
    const dirMtimeMs = stat.mtimeMs

    if (cachedDocuments && cachedMtimeMs === dirMtimeMs) {
      return cachedDocuments
    }

    const entries = await fs.readdir(dataDir)
    const mdFiles = entries.filter((f) => f.endsWith(".md"))

    const documents: Document[] = []

    for (const filename of mdFiles) {
      try {
        const filePath = path.join(dataDir, filename)
        const content = await fs.readFile(filePath, "utf8")
        const paragraphs = content
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0)

        documents.push({ id: filename, filename, content, paragraphs })
      } catch (err) {
        console.error(`Failed to load ${filename}:`, err)
      }
    }

    cachedDocuments = documents
    cachedMtimeMs = dirMtimeMs
    return documents
  } catch (error) {
    console.error("Failed to read data directory:", error)
    return []
  }
}

// Simple BM25-inspired scoring
function calculateScore(query: string, text: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/)
  const textLower = text.toLowerCase()

  let score = 0
  for (const term of queryTerms) {
    if (term.length > 2) {
      const regex = new RegExp(`\\b${term}\\w*`, "g")
      const matches = textLower.match(regex)
      if (matches) {
        score += matches.length * 10
      }
    }
  }

  return score
}

// Retrieve relevant snippets from documents
export async function retrieveRelevantSnippets(query: string, topK = 3): Promise<RetrievalResult[]> {
  const documents = await loadDocuments()
  const results: RetrievalResult[] = []

  for (const doc of documents) {
    for (let i = 0; i < doc.paragraphs.length; i++) {
      const paragraph = doc.paragraphs[i]
      const score = calculateScore(query, paragraph)

      if (score > 0) {
        results.push({
          filename: doc.filename,
          paragraphIndex: i,
          content: paragraph,
          score,
        })
      }
    }
  }

  // Sort by score and return top-k
  const sorted = results.toSorted((a, b) => b.score - a.score)
  return sorted.slice(0, topK)
}

// Format retrieved snippets for the LLM context
export function formatContextForLLM(snippets: RetrievalResult[]): string {
  if (snippets.length === 0) {
    return ""
  }

  const context = snippets
    .map((snippet, idx) => `[Source ${idx + 1}: ${snippet.filename}]\n${snippet.content}`)
    .join("\n\n")

  return context
}

// Extract citations from the response
export function extractCitations(snippets: RetrievalResult[]): Array<{
  filename: string
  section: number
}> {
  return snippets.map((snippet) => ({
    filename: snippet.filename,
    section: snippet.paragraphIndex + 1,
  }))
}
