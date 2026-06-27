import { NextRequest, NextResponse } from "next/server"
import { ocrImages } from "@/lib/ocr"
import { parseEmailText } from "@/lib/parse-email"
import type { UploadedImage } from "@/types"

export const runtime = "nodejs"

const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

export async function POST(req: NextRequest) {
  let body: { images?: UploadedImage[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { images } = body

  if (!images || images.length === 0) {
    return NextResponse.json({ error: "At least one image is required" }, { status: 400 })
  }
  if (images.length > 3) {
    return NextResponse.json({ error: "Maximum 3 screenshots allowed" }, { status: 400 })
  }
  for (const img of images) {
    if (!img.data || !img.mediaType) {
      return NextResponse.json({ error: "Each image must have data and mediaType" }, { status: 400 })
    }
    if (!SUPPORTED_TYPES.has(img.mediaType)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${img.mediaType}. Use PNG, JPEG, or WebP.` },
        { status: 400 }
      )
    }
  }

  try {
    // Step 1: OCR — extract raw text from images locally (no AI tokens)
    const rawText = await ocrImages(images)

    if (!rawText.trim()) {
      return NextResponse.json({ error: "Could not read any text from the screenshots. Please try a clearer image." }, { status: 422 })
    }

    // Step 2: Rule-based parsing — zero AI tokens
    const result = parseEmailText(rawText)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[extract-email]", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
