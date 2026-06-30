import type { AIAdapter } from "./types"

export function getAdapter() {
  const provider = { name: process.env.AI_MODEL ?? "gemini-2.5-flash-lite" }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gemini = require("./gemini").geminiAdapter as AIAdapter
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const openai = require("./openai").openaiAdapter as AIAdapter

  async function tryWithFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    label: string
  ): Promise<T> {
    try {
      const result = await primary()
      provider.name = process.env.AI_MODEL ?? "gemini-2.5-flash-lite"
      return result
    } catch (err) {
      console.warn(`[ai] gemini failed on ${label}, falling back to openai:`, err instanceof Error ? err.message : String(err))
      const result = await fallback()
      provider.name = `${process.env.OPENAI_MODEL ?? "gpt-4o-mini"} (fallback)`
      return result
    }
  }

  const adapter: AIAdapter = {
    extractEmail: (images) =>
      tryWithFallback(() => gemini.extractEmail(images), () => openai.extractEmail(images), "extractEmail"),
    extractEmailFromText: (rawText) =>
      tryWithFallback(() => gemini.extractEmailFromText(rawText), () => openai.extractEmailFromText(rawText), "extractEmailFromText"),
    generateEmail: (params) =>
      tryWithFallback(() => gemini.generateEmail(params), () => openai.generateEmail(params), "generateEmail"),
    refineEmail: (params) =>
      tryWithFallback(() => gemini.refineEmail(params), () => openai.refineEmail(params), "refineEmail"),
  }

  return { adapter, provider }
}
