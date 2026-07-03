/**
 * Unit tests for cleanOcrText filtering and detail extraction in parseEmailText.
 * No API calls, no server needed. Run with: npx tsx scripts/test-clean.ts
 *
 * Guards against over-stripping: every KEEP line is real email content that a
 * previous version of the filters silently deleted before the AI saw it.
 */
import { parseEmailText } from "../lib/parse-email"

let passed = 0
let failed = 0

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`)
    failed++
  }
}

function context(raw: string): string {
  return parseEmailText(raw).context
}

console.log("\n── cleanOcrText: real content must be KEPT ──\n")

const KEEP = [
  "To: jo@acme.com, al@acme.com",                       // two @ — was eaten by isGarbledToolbar
  "Johnson & Johnson & Co will visit.",                  // two & — same
  "We are open 9:30 AM - 5 PM on weekdays.",             // time range
  "9:30 AM - 5 PM",                                      // standalone time range — was eaten by isStatusBar
  "$500",                                                // standalone amount — was eaten by isShortSymbolLine
  "নাম",                                                 // short Bengali line — non-Latin treated as symbols
  "ટીમ",                                                 // short Gujarati line
  "12:45 নাগাদ আসবেন",                                   // Bengali line starting with a time
  "Please summarize this email",                         // real request — was eaten by Copilot pattern
  "Back to you soon!",                                   // real sign-off — was eaten by back-to pattern
]

for (const line of KEEP) {
  const kept = context(`Hello,\n${line}\nThanks`).includes(line)
  check(`keeps: ${JSON.stringify(line)}`, kept)
}

console.log("\n── cleanOcrText: UI chrome must still be STRIPPED ──\n")

const STRIP = [
  "12:01 •••• LTE",                                      // iOS status bar
  "9:41 ▶▶▶",                                            // status bar glyphs
  "Reply",                                               // action button
  "Reply Reply All Forward",                             // Outlook ribbon row
  "Inbox",                                               // sidebar nav
  "Back to inbox",                                       // nav link
  "\\ »",                                                // icon artifact
  "New Slack Group E} Summarize this email",             // Outlook Copilot on subject line
  "1 of 234",                                            // pagination
  "vreoyAl [ W ^ gp @",                                  // garbled icon toolbar
]

for (const line of STRIP) {
  const stripped = !context(`Hello,\n${line}\nThanks`).includes(line)
  check(`strips: ${JSON.stringify(line)}`, stripped)
}

console.log("\n── detail extraction ──\n")

{
  const r = parseEmailText("From: boss@corp.com\nTo: jo@acme.com, al@acme.com\nSubject: Hours")
  check(
    "recipient survives a two-address To: line",
    r.detectedDetails.recipient === "jo@acme.com, al@acme.com",
    `got: ${r.detectedDetails.recipient}`
  )
}

{
  const r = parseEmailText("In case you missed it, the reference for this is attached. Just in case anything changes.")
  check(
    "prose 'in case' / 'reference for' does not pollute orderNumbers",
    r.detectedDetails.orderNumbers.length === 0,
    `got: [${r.detectedDetails.orderNumbers.join(", ")}]`
  )
}

{
  const r = parseEmailText("Your Case 78901 and Ref AB-123 are being processed. Order #12345 shipped.")
  const nums = r.detectedDetails.orderNumbers
  check(
    "IDs with digits are still extracted (Case 78901, Ref AB-123)",
    nums.some(n => n.includes("78901")) && nums.some(n => n.includes("AB-123")),
    `got: [${nums.join(", ")}]`
  )
  check(
    "'#12345' is not duplicated alongside 'Order #12345'",
    nums.filter(n => n.includes("12345")).length === 1,
    `got: [${nums.join(", ")}]`
  )
}

{
  const r = parseEmailText("The deadline is Sept 5, 2026. Tracking 12-34-5678 was sent on 3/15/2026.")
  const dates = r.detectedDetails.dates
  check("'Sept 5, 2026' is extracted", dates.includes("Sept 5, 2026"), `got: [${dates.join(", ")}]`)
  check("'3/15/2026' is extracted", dates.includes("3/15/2026"), `got: [${dates.join(", ")}]`)
  check(
    "tracking fragment '12-34-5678' is not a date",
    !dates.some(d => d.includes("34")),
    `got: [${dates.join(", ")}]`
  )
}

{
  const r = parseEmailText(
    "Contact the Small Business Administration As soon as possible. I'LL check with John Smith Tomorrow morning."
  )
  const terms = r.detectedDetails.importantTerms
  check(
    "trailing sentence words trimmed from phrases",
    terms.includes("Small Business Administration") && !terms.some(t => t.endsWith(" As")),
    `got: [${terms.join(", ")}]`
  )
  check(
    "'John Smith Tomorrow' trimmed to 'John Smith'",
    terms.includes("John Smith") && !terms.includes("John Smith Tomorrow"),
    `got: [${terms.join(", ")}]`
  )
  check("\"I'LL\" does not yield acronym 'LL'", !terms.includes("LL"), `got: [${terms.join(", ")}]`)
}

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
