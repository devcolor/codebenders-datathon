import { type NextRequest, NextResponse } from "next/server"
import { canAccess, type Role } from "@/lib/roles"
import { generateSummary } from "@/lib/model-client"

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role") as Role | null
  if (!role || !canAccess("/api/query-summary", role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (process.env.MODEL_BACKEND !== "ollama" && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  let prompt: string
  let data: unknown[]
  let rowCount: number
  let vizType: string

  try {
    const body = await request.json()
    prompt = body.prompt
    data = body.data
    rowCount = body.rowCount ?? 0
    vizType = body.vizType ?? "unknown"
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!prompt || !Array.isArray(data)) {
    return NextResponse.json({ error: "prompt and data are required" }, { status: 400 })
  }

  // Cap rows sent to LLM to avoid token overflow
  const sampleRows = data.slice(0, 50)

  const llmPrompt = `You are a student success analyst at a community college. An advisor ran the following query and got these results.

QUERY: "${prompt.slice(0, 2000)}"
RESULT: ${rowCount} rows, visualization type: ${vizType}
DATA SAMPLE:
${JSON.stringify(sampleRows, null, 2)}

Write a 2-3 sentence plain-English summary of what these results show. Be specific about the numbers. Do not speculate beyond the data. Address the advisor directly.`

  try {
    const summary = await generateSummary(llmPrompt, 200)
    return NextResponse.json({ summary })
  } catch (error) {
    console.error("[query-summary] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate summary", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
