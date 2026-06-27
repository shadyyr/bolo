import OpenAI from "openai"
import type {
  ExtractedEmailContext,
  GenerateEmailParams,
  RefineEmailParams,
  UploadedImage,
} from "@/types"
import type { AIAdapter } from "./types"
import { buildExtractFromTextPrompt, buildExtractPrompt, buildGeneratePrompt, buildRefinePrompt } from "./prompts"

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
}

function getModel() {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini"
}

function parseJSON(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
  return JSON.parse(cleaned)
}

type MessageContent = OpenAI.Chat.ChatCompletionContentPart

async function generateText(prompt: string, images?: UploadedImage[]): Promise<string> {
  const client = getClient()
  const content: MessageContent[] = []

  if (images) {
    for (const img of images) {
      content.push({
        type: "image_url",
        // OpenAI vision requires a full data URI, not raw base64
        image_url: { url: `data:${img.mediaType};base64,${img.data}` },
      })
    }
  }

  content.push({ type: "text", text: prompt })

  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [{ role: "user", content }],
  })

  return response.choices[0]?.message?.content ?? ""
}

export const openaiAdapter: AIAdapter = {
  async extractEmail(images: UploadedImage[]): Promise<ExtractedEmailContext> {
    const prompt = buildExtractPrompt()
    const raw = await generateText(prompt, images)

    let parsed: unknown
    try {
      parsed = parseJSON(raw)
    } catch {
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
    return generateText(buildGeneratePrompt(params))
  },

  async refineEmail(params: RefineEmailParams): Promise<string> {
    return generateText(buildRefinePrompt(params))
  },
}
