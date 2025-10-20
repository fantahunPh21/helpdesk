import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get("file") || undefined
    const sectionParam = searchParams.get("section") || undefined

    if (!(filename?.endsWith(".md"))) {
      return NextResponse.json({ error: "Missing or invalid file parameter" }, { status: 400 })
    }

    const fs = await import("node:fs/promises")
    const path = await import("node:path")

    const filePath = path.join(process.cwd(), "data", filename)

    let content: string
    try {
      content = await fs.readFile(filePath, "utf8")
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // optional: return only a single section (paragraph index starting at 1)
    if (sectionParam) {
      const sectionIndex = Number(sectionParam)
      if (!Number.isNaN(sectionIndex) && sectionIndex > 0) {
        const paragraphs = content
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
        const idx = sectionIndex - 1
        if (idx >= 0 && idx < paragraphs.length) {
          content = paragraphs[idx]
        }
      }
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Doc API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


