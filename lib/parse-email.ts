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

  // ── Mobile screenshot chrome (iOS Mail, Gmail app, Outlook app, Yahoo app) ──

  // iOS/Android navigation bar: back arrow + truncated subject ending in "..."
  // e.g. "< Need you to let me know what you feel qualifie..."
  /^[<←«]\s*.{5,}\.{2,}$/,

  // Mobile app tab bar / dock at bottom of screen
  // e.g. "Mail Calendar Apps" or "Inbox Compose More"
  /^(mail|calendar|apps?|contacts|messages|notes|settings|home|camera|photos|maps|safari|inbox|compose|more)\s+(mail|calendar|apps?|contacts|messages|notes|settings|home|camera|photos|maps|safari|inbox|compose|more)(\s+(mail|calendar|apps?|contacts|messages|notes|settings|home|camera|photos|maps|safari|inbox|compose|more))?$/i,

  // ── Outlook desktop/web chrome ──

  // Outlook Copilot AI button — OCR captures it on same line as subject
  // e.g. "New Slack Group ALMAmyfriend E} Summarize this email"
  /\bsummarize this email$/i,

  // Outlook retention/compliance banner — always contains both "Retention:" and "Expires:"
  // e.g. "oO Retention: UCF Delete after 10 Years Expires: Tue 6/24/2036 2:35 PM"
  /\bretention:.*\bexpires:/i,

  // Outlook "images blocked" security banner (and its Show content / Report buttons)
  // e.g. "(i ] Images and scripts have been blocked. Show content | | Report Vv"
  /\bimages and scripts have been blocked\b/i,
  /^show content$/i,

  // Reply/Forward buttons rendered with arrow icons (Outlook bottom toolbar)
  // e.g. "< Reply > Forward"
  /^[<←>→•]\s*reply(\s+all)?\s*[<←>→•]\s*forward$/i,

  // Email notification footers (Canvas LMS, university systems, mailing lists)
  // e.g. "View announcement | Update your notification settings"
  /^view announcement\b/i,
  /^update your notification settings$/i,
  /^(unsubscribe|manage preferences|email preferences|notification settings)(\s*\|.*)?$/i,
]

// iOS/Android status bar: starts with a time ("12:01", "9:41") and the rest contains
// no word of 4+ consecutive letters. Catches "12:01 •••• LTE" and "9:41 ▶▶▶"
// but NOT "12:01 PM meeting" (7-letter word) or "Meeting at 9:41 AM" (starts with a letter).
function isStatusBar(line: string): boolean {
  return /^\d{1,2}:\d{2}/.test(line) && !/[a-zA-Z]{4,}/.test(line)
}

// Garbled OCR of icon toolbars: short line, no URLs, ≥2 special chars from
// the set commonly produced by OCR-ing icons (e.g. "vreoyAl 8 W & gp @")
function isGarbledToolbar(line: string): boolean {
  if (line.length > 35 || /^https?:\/\//i.test(line)) return false
  const specialCount = (line.match(/[\\\|@&\^\[\]{}~`]/g) ?? []).length
  return specialCount >= 2
}

// Single non-letter characters are almost always OCR artifacts from icons.
// Preserves "Hi", "OK", "Dr", "Mr" etc.
function isSingleCharArtifact(line: string): boolean {
  return line.length === 1 && !/[a-zA-Z]/.test(line)
}

// Very short lines (≤5 chars) that are mostly symbols — e.g. "\ »", "/!"
// These are icon OCR artifacts that slip past isGarbledToolbar.
function isShortSymbolLine(line: string): boolean {
  if (line.length > 5) return false
  const letters = (line.match(/[a-zA-Z]/g) ?? []).length
  return letters / line.length < 0.5
}

function cleanOcrText(text: string): string {
  return text
    .split("\n")
    .filter(line => {
      const t = line.trim()
      if (t === "") return true
      return (
        !UI_LINE_PATTERNS.some(p => p.test(t)) &&
        !isStatusBar(t) &&
        !isGarbledToolbar(t) &&
        !isSingleCharArtifact(t) &&
        !isShortSymbolLine(t)
      )
    })
    .join("\n")
}

const SKIP_ACRONYMS = new Set([
  "AM", "PM", "OK", "RE", "CC", "FW", "FWD", "PO", "USA", "US",
  "TV", "PC", "ID", "NO", "TO", "IN", "OR", "AT", "BE", "AN",
])

const SKIP_CAPITALIZED = new Set([
  // Greetings / sign-offs
  "Dear", "Hello", "Hi", "Thank", "Thanks", "Best", "Kind", "Yours",
  "Sincerely", "Regards", "Warmly", "Cheers", "Please", "Note",
  // Days / months
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December",
  // Common sentence-starting words that are capitalized but not proper nouns
  "The", "A", "An", "Your", "Our", "Their", "My", "His", "Her", "Its",
  "This", "That", "These", "Those", "We", "You", "They", "He", "She",
  "As", "If", "In", "On", "At", "To", "For", "Of", "With", "By", "All",
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
    let words = phrase.split(" ")
    // Trim leading sentence-starting words (e.g. "Your", "The") that got
    // captured because they were capitalized at the start of a sentence
    while (words.length > 1 && SKIP_CAPITALIZED.has(words[0])) {
      words = words.slice(1)
    }
    if (words.length >= 2 && !words.every(w => SKIP_CAPITALIZED.has(w))) {
      importantTerms.push(words.join(" "))
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
