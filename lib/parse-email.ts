import type { ExtractedEmailContext } from "@/types"

const SKIP_ACRONYMS = new Set([
  "AM", "PM", "OK", "RE", "CC", "FW", "FWD", "PO", "USA", "US",
  "TV", "PC", "ID", "NO", "TO", "IN", "OR", "AT", "BE", "AN",
])

const SKIP_CAPITALIZED = new Set([
  "Dear", "Hello", "Hi", "Thank", "Thanks", "Best", "Kind", "Yours",
  "Sincerely", "Regards", "Warmly", "Cheers", "Please", "Note",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December",
])

export function parseEmailText(rawText: string): ExtractedEmailContext {
  const senderMatch = rawText.match(/^From:\s*(.+)$/mi)
  const recipientMatch = rawText.match(/^To:\s*(.+)$/mi)
  const subjectMatch = rawText.match(/^Subject:\s*(.+)$/mi)

  // Dates: MM/DD/YYYY, Month DD YYYY, DD Month YYYY, abbreviated months
  const datePatterns = [
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
    /\b(?:Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\b/gi,
  ]

  const dates: string[] = []
  for (const pattern of datePatterns) {
    dates.push(...(rawText.match(pattern) ?? []))
  }

  // Order/invoice/reference numbers
  const orderPatterns = [
    /#\d[\d\-]*/g,
    /\bOrder\s+(?:#\s*)?\d+\b/gi,
    /\bInvoice\s+(?:#\s*)?\d+\b/gi,
    /\bRef(?:erence)?\s+(?:#\s*)?[\w\-]+\b/gi,
    /\bCase\s+(?:#\s*)?[\w\-]+\b/gi,
    /\bTicket\s+(?:#\s*)?[\w\-]+\b/gi,
  ]

  const orderNumbers: string[] = []
  for (const pattern of orderPatterns) {
    orderNumbers.push(...(rawText.match(pattern) ?? []).map(m => m.trim()))
  }

  // Important terms: multi-word capitalized phrases + all-caps acronyms
  const importantTerms: string[] = []

  // "Student Scholar Program", "Small Business Administration", etc.
  const phrases = rawText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) ?? []
  for (const phrase of phrases) {
    const words = phrase.split(" ")
    if (!words.every(w => SKIP_CAPITALIZED.has(w))) {
      importantTerms.push(phrase)
    }
  }

  // "LLC", "IRS", "SBA", etc.
  const acronyms = rawText.match(/\b[A-Z]{2,}\b/g) ?? []
  for (const word of acronyms) {
    if (!SKIP_ACRONYMS.has(word)) {
      importantTerms.push(word)
    }
  }

  return {
    context: rawText.trim(),
    detectedDetails: {
      ...(senderMatch?.[1] && { sender: senderMatch[1].trim() }),
      ...(recipientMatch?.[1] && { recipient: recipientMatch[1].trim() }),
      ...(subjectMatch?.[1] && { subject: subjectMatch[1].trim() }),
      importantTerms: [...new Set(importantTerms)],
      dates: [...new Set(dates)],
      orderNumbers: [...new Set(orderNumbers)],
    },
  }
}
