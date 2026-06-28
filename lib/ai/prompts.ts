import type { GenerateEmailParams, RefineEmailParams } from "@/types"

const EXTRACT_JSON_SHAPE = `{"context":"<full thread text>","detectedDetails":{"sender":"<most recent sender>","recipient":"<recipient>","subject":"<subject>","importantTerms":["<brand names, product names, order IDs, program names, jargon>"],"dates":["<dates/deadlines>"],"orderNumbers":["<order/invoice/reference numbers>"],"requestedAction":"<what is being asked>"}}`

const EXTRACT_RULES = `Critical rules:
- Copy all text EXACTLY as it appears — no spelling corrections, no auto-correct of any kind. If the text says "Limbitless", write "Limbitless" not "Limitless".
- importantTerms: include any English word a non-English speaker would borrow directly (brand names, legal terms, product names, program names)
- Omit fields that are not present`

const LANGUAGE_NAMES: Record<string, string> = {
  bn: "Bangla (Bengali)",
  es: "Spanish",
  gu: "Gujarati",
}

export function buildExtractPrompt(): string {
  return `Extract the email thread from these screenshots and return ONLY this JSON (no markdown, no explanation):

${EXTRACT_JSON_SHAPE}

${EXTRACT_RULES}`
}

export function buildExtractFromTextPrompt(rawText: string): string {
  return `The following text was extracted from email screenshots via OCR. Structure it and return ONLY this JSON (no markdown, no explanation):

${EXTRACT_JSON_SHAPE}

RAW OCR TEXT:
${rawText}

${EXTRACT_RULES}`
}

export function buildGeneratePrompt(params: GenerateEmailParams): string {
  if (params.mode === "compose") {
    return buildComposePrompt(params)
  }

  const languageName = LANGUAGE_NAMES[params.language] ?? params.language
  const termsLine =
    params.importantTerms.length > 0
      ? params.importantTerms.join(", ")
      : "(none identified)"

  return `You are an expert email assistant helping an immigrant business owner reply professionally in English.

ORIGINAL EMAIL THREAD:
${params.emailContext}

KEY TERMS FROM THIS EMAIL THREAD (English terms the user may reference in their native language):
${termsLine}

The user wrote their intended reply in ${languageName}. They may have embedded English words from the thread above — these are deliberate references to those terms, NOT translation mistakes. They may also use informal, colloquial, or slang expressions natural to ${languageName} — interpret these by their intended meaning in context, not literally.

USER INPUT (${languageName}, may contain embedded English terms and colloquial expressions):
${params.userInput}

Instructions:
1. Understand the user's full intent from their native-language input, including any slang or colloquial phrasing
2. Treat any English words matching the key terms above as intentional references to those concepts
3. Write a professional, complete English email reply with an appropriate greeting and sign-off
4. Match the formality level of the original email thread
5. Do NOT invent names, prices, dates, order numbers, deadlines, attachments, or promises not present in the email thread or user input. If a detail is unclear, phrase it generally instead of guessing.
6. If the user's input is incomplete, write the best professional version using only the available information. Do not ask follow-up questions unless the email truly cannot be written safely without clarification.

Return only the email text, nothing else.`
}

function buildComposePrompt(params: GenerateEmailParams): string {
  const languageName = LANGUAGE_NAMES[params.language] ?? params.language

  return `You are an expert email assistant helping an immigrant business owner write a professional email in English.

The user described in ${languageName} what they want to communicate. Their input may mix ${languageName} with English — any English words appearing within ${languageName} sentences (names, company names, job titles, business terms, product names, prices stated in English) are intentional cross-language references, not translation mistakes. The user may also use informal, colloquial, or slang expressions in ${languageName} — interpret these by their natural meaning in context.

USER DESCRIPTION (${languageName}):
${params.userInput}

Instructions:
1. Understand who the user wants to write to and what they want to communicate, including any slang or colloquial phrasing
2. Write a professional, complete English email with an appropriate greeting and sign-off
3. Use a professional business tone appropriate for the context described
4. If the user has not specified a recipient name, use a generic greeting (e.g., "Dear Sir or Madam," or "To Whom It May Concern,")
5. Do NOT invent specific names, prices, dates, or numbers not mentioned by the user. If a detail is missing, write around it professionally.
6. If the user's description is incomplete, write the best professional version using only what was provided.

Return only the email text, nothing else.`
}

export function buildRefinePrompt(params: RefineEmailParams): string {
  return `You are an expert email editor. The user wants to adjust a generated English email.

ORIGINAL EMAIL THREAD CONTEXT:
${params.emailContext}

CURRENT EMAIL DRAFT:
${params.currentEmail}

The user's refinement instruction may be in any language — accept any of these:
REFINEMENT INSTRUCTION:
${params.refinement}

Instructions:
1. Understand what the user wants to change
2. Apply the requested changes to the email draft
3. Do NOT invent new facts, names, prices, or promises not in the original thread or draft
4. Preserve the professional tone and format unless the user asks to change it
5. Return the complete updated email text only — no explanation, no commentary`
}
