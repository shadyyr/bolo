import { NextRequest, NextResponse } from "next/server"
import { getAdapter } from "@/lib/ai"
import { detectPromptInjection } from "@/lib/detect-injection"
import { stripMarkdown } from "@/lib/sanitize-email"
import { invalidRequestBody, invalidStringField, sanitizeTerms } from "@/lib/validate"
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

  const bodyError = invalidRequestBody(body)
  if (bodyError) {
    return NextResponse.json({ error: bodyError }, { status: 400 })
  }

  const { emailContext, importantTerms, userInput, language, mode } = body

  const fieldError =
    invalidStringField(userInput, "userInput", { required: true, maxLength: 5000 }) ??
    invalidStringField(emailContext, "emailContext", { maxLength: 20000 })
  if (fieldError) {
    return NextResponse.json({ error: fieldError }, { status: 400 })
  }
  if (!language || !SUPPORTED_LANGUAGES.has(language)) {
    return NextResponse.json({ error: "language must be 'bn', 'es', or 'gu'" }, { status: 400 })
  }
  const terms = sanitizeTerms(importantTerms)
  if (!Array.isArray(terms)) {
    return NextResponse.json({ error: terms.error }, { status: 400 })
  }

  const injectionError = detectPromptInjection(userInput as string)
  if (injectionError) {
    return NextResponse.json({ error: injectionError }, { status: 400 })
  }

  const resolvedMode: EmailMode = mode === "compose" ? "compose" : "reply"

  if (resolvedMode === "reply" && !emailContext?.trim()) {
    return NextResponse.json({ error: "emailContext is required for reply mode" }, { status: 400 })
  }

  try {
    const { adapter, provider } = getAdapter()
    const email = await adapter.generateEmail({
      emailContext: emailContext ?? "",
      importantTerms: terms,
      userInput: userInput as string,
      language,
      mode: resolvedMode,
    })
    return NextResponse.json({ email: stripMarkdown(email), model: provider.name })
  } catch (err) {
    console.error("[generate-email]", err)
    return NextResponse.json({ error: "Failed to generate email" }, { status: 500 })
  }
}
