import { createWorker } from "tesseract.js"
import type { UploadedImage } from "@/types"

export async function ocrImages(images: UploadedImage[]): Promise<string> {
  const worker = await createWorker("eng")

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
