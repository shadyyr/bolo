import path from "path"
import { createWorker } from "tesseract.js"
import type { UploadedImage } from "@/types"

export async function ocrImages(images: UploadedImage[]): Promise<string> {
  const worker = await createWorker("eng", 1, {
    // Read language data from the bundled file instead of downloading from CDN.
    // Eliminates the ~3MB download that caused slow cold starts on Vercel.
    langPath: path.join(process.cwd(), "public", "tessdata"),
    cachePath: "/tmp",
  })

  try {
    const texts: string[] = []
    for (const img of images) {
      const buffer = Buffer.from(img.data, "base64")
      const { data } = await worker.recognize(buffer)
      const text = data.text.trim()
      if (text) texts.push(text)
    }
    return texts.join("\n\n---\n\n")
  } finally {
    await worker.terminate()
  }
}
