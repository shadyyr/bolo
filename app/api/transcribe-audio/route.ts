import { NextRequest, NextResponse } from "next/server"
import { getAdapter } from "@/lib/ai"
import type { SupportedLanguage } from "@/types"

export const runtime = "nodejs"
// Transcribing a multi-minute clip can exceed the 10s default; Vercel Hobby
// allows up to 60s when set explicitly
export const maxDuration = 60

const SUPPORTED_LANGUAGES = new Set<SupportedLanguage>(["bn", "es", "gu"])

// Base mime types the browser MediaRecorder produces (webm on Chrome/Firefox,
// mp4 on Safari/iOS) plus common fallbacks — all accepted by Gemini/Whisper
const SUPPORTED_MIME_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
])

// ~4MB of base64 (~3MB of audio) stays under Vercel's 4.5MB body limit.
// At the client's 32kbps opus that is well over 10 minutes of speech.
const MAX_BASE64_LENGTH = 4_000_000

export async function POST(req: NextRequest) {
  let body: { audio?: unknown; mimeType?: unknown; language?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { audio, mimeType, language } = body

  if (typeof audio !== "string" || !audio) {
    return NextResponse.json({ error: "audio is required" }, { status: 400 })
  }
  if (audio.length > MAX_BASE64_LENGTH) {
    return NextResponse.json(
      { error: "Recording is too long — please record a shorter message" },
      { status: 400 }
    )
  }
  if (typeof mimeType !== "string" || !SUPPORTED_MIME_TYPES.has(mimeType.split(";")[0].trim())) {
    return NextResponse.json({ error: "Unsupported audio format" }, { status: 400 })
  }
  if (typeof language !== "string" || !SUPPORTED_LANGUAGES.has(language as SupportedLanguage)) {
    return NextResponse.json({ error: "language must be 'bn', 'es', or 'gu'" }, { status: 400 })
  }

  try {
    const { adapter } = getAdapter()
    const text = await adapter.transcribeAudio(
      { data: audio, mimeType: mimeType.split(";")[0].trim() },
      language as SupportedLanguage
    )
    // Empty text is a valid result: the clip contained no intelligible speech
    return NextResponse.json({ text })
  } catch (err) {
    console.error("[transcribe-audio]", err)
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 })
  }
}
