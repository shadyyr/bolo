import type { ExtractedEmailContext } from "@/types"

// Exact-line patterns for UI chrome from Gmail, Outlook, Yahoo, Apple Mail.
// All patterns require the ENTIRE trimmed line to match — a sentence that happens
// to contain one of these words (e.g. "Please reply by Friday") is never stripped.
const UI_LINE_PATTERNS = [
  // Single action buttons — all clients
  /^(reply|reply all|forward|archive|delete|print|report spam|report phishing|block|mute|junk|trash|more|flag|unflag|star|unstar|snooze|sweep|categorize|move to|add to tasks|create event|show original|mark as read|mark as unread)$/i,
  // Multi-button rows that appear in email client toolbars
  // (e.g. Gmail bottom row, Outlook ribbon, Yahoo action bar)
  /^reply\s+(all\s+)?forward(\s+archive)?(\s+delete)?$/i,
  /^forward\s+(archive\s+)?delete$/i,
  /^archive\s+delete(\s+more)?$/i,
  // Gmail sidebar nav
  /^(inbox|starred|snoozed|sent|drafts|spam|all mail|chats?|meet|hangouts?|compose)$/i,
  // Outlook sidebar nav + toolbar labels
  /^(junk email|sent items|deleted items|focused inbox?|focused|other|conversation history|back to message list|create rule|view message source|open in new window)$/i,
  // Outlook ribbon: OCR often captures "Reply  Reply All  Forward" as one line
  /^reply\s+reply\s+all\s+forward(\s+archive)?(\s+delete)?$/i,
  // Yahoo Mail nav
  /^(back to inbox|back to (sent|drafts|spam|trash))$/i,
  // Apple Mail / iOS Mail
  /^(mailboxes|move to junk|move to trash|notify me)$/i,
  // Common navigation / search
  /^(newer|older|search mail|search in mail)$/i,
  // Pagination counters: "1 of 234" or "3 messages"
  /^\d+\s+of\s+\d+$/,
  /^\d+\s+(messages?|emails?|conversations?)$/i,
  // Standalone separator/arrow symbols with no other text
  /^[←→↑↓‹›<>|·•—–\s]+$/,
  // "Back to …" navigation links (short — avoids catching real sentences)
  /^back to .{1,25}$/i,
]

function cleanOcrText(text: string): string {
  return text
    .split("\n")
    .filter(line => {
      const t = line.trim()
      return t === "" || !UI_LINE_PATTERNS.some(p => p.test(t))
    })
    .join("\n")
}

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
  const text = cleanOcrText(rawText)
  const senderMatch = text.match(/^From:\s*(.+)$/mi)
  const recipientMatch = text.match(/^To:\s*(.+)$/mi)
  const subjectMatch = text.match(/^Subject:\s*(.+)$/mi)

  // Dates: MM/DD/YYYY, Month DD YYYY, DD Month YYYY, abbreviated months
  const datePatterns = [
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
    /\b(?:Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\b/gi,
  ]

  const dates: string[] = []
  for (const pattern of datePatterns) {
    dates.push(...(text.match(pattern) ?? []))
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
    orderNumbers.push(...(text.match(pattern) ?? []).map(m => m.trim()))
  }

  // Important terms: multi-word capitalized phrases + all-caps acronyms
  const importantTerms: string[] = []

  // "Student Scholar Program", "Small Business Administration", etc.
  const phrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) ?? []
  for (const phrase of phrases) {
    const words = phrase.split(" ")
    if (!words.every(w => SKIP_CAPITALIZED.has(w))) {
      importantTerms.push(phrase)
    }
  }

  // "LLC", "IRS", "SBA", etc.
  const acronyms = text.match(/\b[A-Z]{2,}\b/g) ?? []
  for (const word of acronyms) {
    if (!SKIP_ACRONYMS.has(word)) {
      importantTerms.push(word)
    }
  }

  return {
    context: text.trim(),
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
