import type {
  ExtractedEmailContext,
  GenerateEmailParams,
  RefineEmailParams,
  UploadedImage,
} from "@/types"

export interface AIAdapter {
  extractEmail(images: UploadedImage[]): Promise<ExtractedEmailContext>
  extractEmailFromText(rawText: string): Promise<ExtractedEmailContext>
  generateEmail(params: GenerateEmailParams): Promise<string>
  refineEmail(params: RefineEmailParams): Promise<string>
}
