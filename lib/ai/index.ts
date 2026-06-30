import type { AIAdapter } from "./types"

export function getAdapter() {
  const provider = { name: process.env.AI_MODEL ?? "gemini-2.5-flash-lite" }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const adapter = require("./gemini").geminiAdapter as AIAdapter
  return { adapter, provider }
}
