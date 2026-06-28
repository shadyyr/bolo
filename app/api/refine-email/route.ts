import { NextRequest, NextResponse } from "next/server"
import { getAdapter } from "@/lib/ai"
import { detectPromptInjection } from "@/lib/detect-injection"
import type { RefineEmailParams } from "@/types"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  let body: Partial<RefineEmailParams>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { currentEmail, refinement, emailContext } = body

  if (!currentEmail?.trim()) {
    return NextResponse.json({ error: "currentEmail is required" }, { status: 400 })
  }
  if (!refinement?.trim()) {
    return NextResponse.json({ error: "refinement is required" }, { status: 400 })
  }
  if (refinement.length > 2000) {
    return NextResponse.json({ error: "refinement must be under 2000 characters" }, { status: 400 })
  }

  const injectionError = detectPromptInjection(refinement)
  if (injectionError) {
    return NextResponse.json({ error: injectionError }, { status: 400 })
  }

  try {
    const { adapter, provider } = getAdapter()
    const email = await adapter.refineEmail({ currentEmail, refinement, emailContext: emailContext ?? "" })
    return NextResponse.json({ email, model: provider.name })
  } catch (err) {
    console.error("[refine-email]", err)
    return NextResponse.json({ error: "Failed to refine email" }, { status: 500 })
  }
}
