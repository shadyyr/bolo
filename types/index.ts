export type SupportedLanguage = "bn" | "es" | "gu"

export type EmailMode = "reply" | "compose"

export type UploadedImage = {
  data: string // base64, no data URI prefix
  mediaType: "image/png" | "image/jpeg" | "image/webp"
  name?: string
}

export type Step = "upload" | "context" | "input" | "review"

export type ExtractedEmailContext = {
  context: string
  detectedDetails: {
    sender?: string
    recipient?: string
    subject?: string
    importantTerms: string[]
    dates: string[]
    orderNumbers: string[]
    requestedAction?: string
  }
}

export interface GenerateEmailParams {
  emailContext: string
  importantTerms: string[]
  userInput: string
  language: SupportedLanguage
  mode: EmailMode
}

export interface RefineEmailParams {
  currentEmail: string
  refinement: string
  emailContext: string
}
