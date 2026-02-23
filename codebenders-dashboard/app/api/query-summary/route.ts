import { type NextRequest, NextResponse } from "next/server"
import { canAccess, type Role } from "@/lib/roles"
import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || "" })

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !canAccess("/api/query-summary", role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  const { prompt, data, rowCount, vizType } = await request.json()

  if (!prompt || !Array.isArray(data)) {
    return NextResponse.json({ error: "prompt and data are required" }, { status: 400 })
  }

  // Cap rows sent to LLM to avoid token overflow
  const sampleRows = data.slice(0, 50)

  const llmPrompt = `You are a student success analyst at a community college. An advisor ran the following query and got these results.

QUERY: "${prompt}"
RESULT: ${rowCount} rows, visualization type: ${vizType}
DATA SAMPLE:
${JSON.stringify(sampleRows, null, 2)}

Write a 2-3 sentence plain-English summary of what these results show. Be specific about the numbers. Do not speculate beyond the data. Address the advisor directly.`

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: llmPrompt,
      maxOutputTokens: 200,
    })
    return NextResponse.json({ summary: result.text })
  } catch (error) {
    console.error("[query-summary] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate summary", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
