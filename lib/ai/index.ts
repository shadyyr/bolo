import type { AIAdapter } from "./types"

export function getAdapter() {
  const provider = { name: process.env.AI_MODEL ?? "gemini-2.5-flash-lite" }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gemini = require("./gemini").geminiAdapter as AIAdapter
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const claude = require("./claude").claudeAdapter as AIAdapter
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const openai = require("./openai").openaiAdapter as AIAdapter

  const PROVIDER_NAMES = {
    gemini: process.env.AI_MODEL ?? "gemini-2.5-flash-lite",
    claude: `${process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001"} (fallback)`,
    openai: `${process.env.OPENAI_MODEL ?? "gpt-4o-mini"} (fallback)`,
  }

  async function tryInOrder<T>(
    attempts: Array<{ fn: () => Promise<T>; providerKey: keyof typeof PROVIDER_NAMES }>,
    label: string
  ): Promise<T> {
    let lastErr: unknown
    for (const { fn, providerKey } of attempts) {
      try {
        const result = await fn()
        provider.name = PROVIDER_NAMES[providerKey]
        return result
      } catch (err) {
        lastErr = err
        console.warn(
          `[ai] ${PROVIDER_NAMES[providerKey]} failed on ${label}:`,
          err instanceof Error ? err.message : String(err)
        )
      }
    }
    throw lastErr
  }

  const adapter: AIAdapter = {
    extractEmail: (images) =>
      tryInOrder([
        { fn: () => gemini.extractEmail(images), providerKey: "gemini" },
        { fn: () => claude.extractEmail(images), providerKey: "claude" },
        { fn: () => openai.extractEmail(images), providerKey: "openai" },
      ], "extractEmail"),

    extractEmailFromText: (rawText) =>
      tryInOrder([
        { fn: () => gemini.extractEmailFromText(rawText), providerKey: "gemini" },
        { fn: () => claude.extractEmailFromText(rawText), providerKey: "claude" },
        { fn: () => openai.extractEmailFromText(rawText), providerKey: "openai" },
      ], "extractEmailFromText"),

    generateEmail: (params) =>
      tryInOrder([
        { fn: () => gemini.generateEmail(params), providerKey: "gemini" },
        { fn: () => claude.generateEmail(params), providerKey: "claude" },
        { fn: () => openai.generateEmail(params), providerKey: "openai" },
      ], "generateEmail"),

    refineEmail: (params) =>
      tryInOrder([
        { fn: () => gemini.refineEmail(params), providerKey: "gemini" },
        { fn: () => claude.refineEmail(params), providerKey: "claude" },
        { fn: () => openai.refineEmail(params), providerKey: "openai" },
      ], "refineEmail"),
  }

  return { adapter, provider }
}
