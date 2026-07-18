import { NextRequest, NextResponse } from "next/server"
import { getAdapter } from "@/lib/ai"
import { detectPromptInjection } from "@/lib/detect-injection"
import { stripMarkdown } from "@/lib/sanitize-email"
import { invalidRequestBody, invalidStringField } from "@/lib/validate"
import type { RefineEmailParams } from "@/types"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  let body: Partial<RefineEmailParams>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const bodyError = invalidRequestBody(body)
  if (bodyError) {
    return NextResponse.json({ error: bodyError }, { status: 400 })
  }

  const { currentEmail, refinement, emailContext } = body

  const fieldError =
    invalidStringField(currentEmail, "currentEmail", { required: true, maxLength: 10000 }) ??
    invalidStringField(refinement, "refinement", { required: true, maxLength: 2000 }) ??
    invalidStringField(emailContext, "emailContext", { maxLength: 20000 })
  if (fieldError) {
    return NextResponse.json({ error: fieldError }, { status: 400 })
  }

  const injectionError = detectPromptInjection(refinement as string)
  if (injectionError) {
    return NextResponse.json({ error: injectionError }, { status: 400 })
  }

  try {
    const { adapter, provider } = getAdapter()
    const email = await adapter.refineEmail({
      currentEmail: currentEmail as string,
      refinement: refinement as string,
      emailContext: emailContext ?? "",
    })
    return NextResponse.json({ email: stripMarkdown(email), model: provider.name })
  } catch (err) {
    console.error("[refine-email]", err)
    return NextResponse.json({ error: "Failed to refine email" }, { status: 500 })
  }
}
