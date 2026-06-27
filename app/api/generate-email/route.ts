import { NextRequest, NextResponse } from "next/server"
import { getAdapter } from "@/lib/ai"
import type { EmailMode, GenerateEmailParams, SupportedLanguage } from "@/types"

export const runtime = "nodejs"

const SUPPORTED_LANGUAGES = new Set<SupportedLanguage>(["bn", "es", "gu"])

export async function POST(req: NextRequest) {
  let body: Partial<GenerateEmailParams>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { emailContext, importantTerms, userInput, language, mode } = body

  if (!userInput?.trim()) {
    return NextResponse.json({ error: "userInput is required" }, { status: 400 })
  }
  if (!language || !SUPPORTED_LANGUAGES.has(language)) {
    return NextResponse.json({ error: "language must be 'bn' or 'es'" }, { status: 400 })
  }
  if (userInput.length > 5000) {
    return NextResponse.json({ error: "userInput must be under 5000 characters" }, { status: 400 })
  }

  const resolvedMode: EmailMode = mode === "compose" ? "compose" : "reply"

  if (resolvedMode === "reply" && !emailContext?.trim()) {
    return NextResponse.json({ error: "emailContext is required for reply mode" }, { status: 400 })
  }

  try {
    const { adapter, provider } = getAdapter()
    const email = await adapter.generateEmail({
      emailContext: emailContext ?? "",
      importantTerms: importantTerms ?? [],
      userInput,
      language,
      mode: resolvedMode,
    })
    return NextResponse.json({ email, model: provider.name })
  } catch (err) {
    console.error("[generate-email]", err)
    return NextResponse.json({ error: "Failed to generate email" }, { status: 500 })
  }
}
