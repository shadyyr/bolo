import Anthropic from "@anthropic-ai/sdk"
import type {
  ExtractedEmailContext,
  GenerateEmailParams,
  RefineEmailParams,
  UploadedImage,
} from "@/types"
import type { AIAdapter } from "./types"
import { buildExtractFromTextPrompt, buildExtractPrompt, buildGeneratePrompt, buildRefinePrompt } from "./prompts"

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

function getModel() {
  return process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001"
}

function parseJSON(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
  return JSON.parse(cleaned)
}

async function generateText(
  prompt: string,
  images?: UploadedImage[]
): Promise<string> {
  const client = getClient()

  type AnthropicMediaType = "image/png" | "image/jpeg" | "image/webp" | "image/gif"

  const content: Anthropic.MessageParam["content"] = []

  if (images) {
    for (const img of images) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mediaType as AnthropicMediaType,
          data: img.data,
        },
      })
    }
  }
  content.push({ type: "text", text: prompt })

  const response = await client.messages.create({
    model: getModel(),
    max_tokens: 2048,
    messages: [{ role: "user", content }],
  })

  const block = response.content[0]
  return block.type === "text" ? block.text : ""
}

export const claudeAdapter: AIAdapter = {
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
    const prompt = buildGeneratePrompt(params)
    return generateText(prompt)
  },

  async refineEmail(params: RefineEmailParams): Promise<string> {
    const prompt = buildRefinePrompt(params)
    return generateText(prompt)
  },
}
