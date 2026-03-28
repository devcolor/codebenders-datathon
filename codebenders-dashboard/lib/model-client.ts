/**
 * Model client adapter — routes inference to Ollama (fine-tuned) or
 * OpenAI (fallback) based on MODEL_BACKEND env var.
 */

import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const MODEL_BACKEND = process.env.MODEL_BACKEND || "openai"
const SCHOOL_CODE = process.env.SCHOOL_CODE || "bishop-state"
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
const MODEL_SIZE = process.env.MODEL_SIZE || "9b"

let _openai: ReturnType<typeof createOpenAI> | null = null

function getOpenAI() {
  if (!_openai) {
    _openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || "" })
  }
  return _openai
}

async function callOllama(model: string, prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 1024,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.response
}

async function generate(
  task: "explainer" | "summarizer",
  prompt: string,
  maxTokens: number,
): Promise<string> {
  if (MODEL_BACKEND === "ollama") {
    const model = `${SCHOOL_CODE}-${task}:${MODEL_SIZE}`
    return callOllama(model, prompt)
  }
  const result = await generateText({
    model: getOpenAI()("gpt-4o-mini"),
    prompt,
    maxOutputTokens: maxTokens,
  })
  return result.text
}

/**
 * Generate a course pairing explanation.
 */
export async function generateExplanation(
  prompt: string,
  maxTokens: number = 320,
): Promise<string> {
  return generate("explainer", prompt, maxTokens)
}

/**
 * Generate a query result summary.
 */
export async function generateSummary(
  prompt: string,
  maxTokens: number = 200,
): Promise<string> {
  return generate("summarizer", prompt, maxTokens)
}
