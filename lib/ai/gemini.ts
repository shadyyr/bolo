import { GoogleGenAI } from "@google/genai"
import type {
  ExtractedEmailContext,
  GenerateEmailParams,
  RefineEmailParams,
  UploadedImage,
} from "@/types"
import type { AIAdapter } from "./types"
import { buildExtractFromTextPrompt, buildExtractPrompt, buildGeneratePrompt, buildRefinePrompt } from "./prompts"

function getClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
}

function getModel() {
  return process.env.AI_MODEL ?? "gemini-2.5-flash-lite"
}

function parseJSON(text: string): unknown {
  // strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
  return JSON.parse(cleaned)
}

async function generateText(prompt: string, imageParts?: UploadedImage[]): Promise<string> {
  const client = getClient()
  const parts: object[] = []

  if (imageParts) {
    for (const img of imageParts) {
      parts.push({ inlineData: { mimeType: img.mediaType, data: img.data } })
    }
  }
  parts.push({ text: prompt })

  const response = await client.models.generateContent({
    model: getModel(),
    contents: [{ role: "user", parts }],
  })

  return response.text ?? ""
}

export const geminiAdapter: AIAdapter = {
  async extractEmail(images: UploadedImage[]): Promise<ExtractedEmailContext> {
    const prompt = buildExtractPrompt()
    const raw = await generateText(prompt, images)

    let parsed: unknown
    try {
      parsed = parseJSON(raw)
    } catch {
      // retry: ask to fix the JSON
      const retryPrompt = `The following text is supposed to be valid JSON but failed to parse. Return ONLY the corrected JSON with no explanation:\n\n${raw}`
      const retryRaw = await generateText(retryPrompt)
      parsed = parseJSON(retryRaw)
    }

    return parsed as ExtractedEmailContext
  },

  async extractEmailFromText(rawText: string): Promise<ExtractedEmailContext> {
    const raw = await generateText(buildExtractFromTextPrompt(rawText))

    let parsed: unknown
    try {
      parsed = parseJSON(raw)
    } catch {
      const retryRaw = await generateText(
        `Return ONLY the corrected JSON with no explanation:\n\n${raw}`
      )
      parsed = parseJSON(retryRaw)
    }

    return parsed as ExtractedEmailContext
  },

  async generateEmail(params: GenerateEmailParams): Promise<string> {
    const prompt = buildGeneratePrompt(params)
    return generateText(prompt)
  },

  async refineEmail(params: RefineEmailParams): Promise<string> {
    const prompt = buildRefinePrompt(params)
    return generateText(prompt)
  },
}
