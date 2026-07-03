import type {
  AudioClip,
  ExtractedEmailContext,
  GenerateEmailParams,
  RefineEmailParams,
  SupportedLanguage,
  UploadedImage,
} from "@/types"

export interface AIAdapter {
  extractEmail(images: UploadedImage[]): Promise<ExtractedEmailContext>
  extractEmailFromText(rawText: string): Promise<ExtractedEmailContext>
  generateEmail(params: GenerateEmailParams): Promise<string>
  refineEmail(params: RefineEmailParams): Promise<string>
  // Returns the transcript, or "" when the clip contains no intelligible
  // speech — an empty transcript is a valid outcome, not an error
  transcribeAudio(audio: AudioClip, language: SupportedLanguage): Promise<string>
}
