import { NextRequest, NextResponse } from "next/server"
import { getAdapter } from "@/lib/ai"
import { invalidRequestBody } from "@/lib/validate"
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

// Checks the first few decoded bytes against the known magic-byte signature
// for the claimed (normalized) mimeType. This only catches "not a real audio
// container at all" — it cannot detect a syntactically valid container that
// holds silent/garbled/meaningless audio, which is a separate, harder problem.
function looksLikeAudio(base64: string, mimeType: string): boolean {
  let bytes: Buffer
  try {
    bytes = Buffer.from(base64.slice(0, 64), "base64")
  } catch {
    return false
  }
  switch (mimeType) {
    case "audio/webm":
      return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
    case "audio/ogg":
      return bytes.length >= 4 && bytes.toString("ascii", 0, 4) === "OggS"
    case "audio/wav":
      return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WAVE"
    case "audio/mp4":
      return bytes.length >= 8 && bytes.toString("ascii", 4, 8) === "ftyp"
    case "audio/mpeg":
      return bytes.length >= 3 && (bytes.toString("ascii", 0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0))
    default:
      return true // unreachable: mimeType is already constrained to SUPPORTED_MIME_TYPES by the earlier check
  }
}

export async function POST(req: NextRequest) {
  let body: { audio?: unknown; mimeType?: unknown; language?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const bodyError = invalidRequestBody(body)
  if (bodyError) {
    return NextResponse.json({ error: bodyError }, { status: 400 })
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
  const normalizedMimeType = typeof mimeType === "string" ? mimeType.split(";")[0].trim() : ""
  if (typeof mimeType !== "string" || !SUPPORTED_MIME_TYPES.has(normalizedMimeType)) {
    return NextResponse.json({ error: "Unsupported audio format" }, { status: 400 })
  }
  if (!looksLikeAudio(audio, normalizedMimeType)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid audio recording. Please try again." },
      { status: 400 }
    )
  }
  if (typeof language !== "string" || !SUPPORTED_LANGUAGES.has(language as SupportedLanguage)) {
    return NextResponse.json({ error: "language must be 'bn', 'es', or 'gu'" }, { status: 400 })
  }

  try {
    const { adapter } = getAdapter()
    const text = await adapter.transcribeAudio(
      { data: audio, mimeType: normalizedMimeType },
      language as SupportedLanguage
    )
    // Empty text is a valid result: the clip contained no intelligible speech
    return NextResponse.json({ text })
  } catch (err) {
    console.error("[transcribe-audio]", err)
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 })
  }
}
