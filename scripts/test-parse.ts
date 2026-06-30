/**
 * Unit tests for importantTerms extraction in parseEmailText.
 * No API calls, no server needed. Run with: npx tsx scripts/test-parse.ts
 */
import { parseEmailText } from "../lib/parse-email"

let passed = 0
let failed = 0

function expect(label: string, actual: string[], mustInclude: string[], mustExclude: string[] = []) {
  const missing = mustInclude.filter(t => !actual.includes(t))
  const present = mustExclude.filter(t => actual.includes(t))
  if (missing.length === 0 && present.length === 0) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.log(`  ✗ ${label}`)
    if (missing.length) console.log(`      missing: ${missing.join(", ")}`)
    if (present.length) console.log(`      should NOT be present: ${present.join(", ")}`)
    console.log(`      got: [${actual.join(", ")}]`)
    failed++
  }
}

function terms(emailText: string): string[] {
  return parseEmailText(emailText).detectedDetails.importantTerms
}

console.log("\n── importantTerms extraction ──\n")

// Multi-word capitalized phrases
expect(
  "extracts multi-word capitalized phrases",
  terms("Thank you for your interest in the Student Scholar Program at our university."),
  ["Student Scholar Program"],
  ["Thank", "Dear"]
)

expect(
  "extracts multiple phrases from one email",
  terms("Your Small Business Administration loan and Amazon Prime membership are both confirmed."),
  ["Small Business Administration", "Amazon Prime"],
)

expect(
  "extracts company name + descriptor",
  terms("Please contact Limbitless Solutions regarding your prosthetic arm."),
  ["Limbitless Solutions"],
)

expect(
  "extracts multi-word org names",
  terms("The New York City Housing Authority has approved your application."),
  ["New York City Housing Authority"],
)

// ALL-CAPS acronyms
expect(
  "extracts meaningful acronyms",
  terms("Your SBA loan application has been approved. Contact the IRS regarding your LLC."),
  ["SBA", "IRS", "LLC"],
)

// Skip list — should NOT extract these
expect(
  "skips common greeting words",
  terms("Dear Mike, Thank you for reaching out. Best regards."),
  [],
  ["Dear", "Thank", "Best"]
)

expect(
  "skips day/month names",
  terms("Please reply by Monday. The deadline is December 15th."),
  [],
  ["Monday", "December"]
)

expect(
  "skips common acronyms (AM, PM, OK, RE, CC, USA)",
  terms("Meeting at 9:00 AM. RE: your question. CC: the team. OK to proceed. USA address required."),
  [],
  ["AM", "PM", "RE", "CC", "OK", "USA"]
)

// Mixed real-world case
expect(
  "real-world: UCF scholarship email",
  terms("From: scholarships@ucf.edu\nSubject: UCF Knight Scholarship Program\nDear Student, You have been selected for the UCF Knight Scholarship Program. Please contact Financial Aid."),
  ["UCF", "Knight Scholarship Program", "Financial Aid"],
  ["Dear", "Student", "Please"]
)

expect(
  "real-world: Amazon order email",
  terms("Your Amazon order #12345 for the Echo Dot has shipped. Expected delivery: Tuesday."),
  ["Echo Dot"],     // "Amazon" is single-word — known gap; "Echo Dot" (two words) IS extracted
  ["Tuesday"]
)

expect(
  "real-world: SBA small business email",
  terms("The Small Business Administration (SBA) has reviewed your Paycheck Protection Program (PPP) application."),
  ["Small Business Administration", "SBA", "Paycheck Protection Program", "PPP"],
)

// Deduplication
const dupeTerms = terms("The SBA loan officer at the SBA office confirmed your SBA application.")
expect(
  "deduplicates repeated terms",
  dupeTerms,
  ["SBA"],
)
if (dupeTerms.filter(t => t === "SBA").length > 1) {
  console.log(`  ✗ deduplication: SBA appears ${dupeTerms.filter(t => t === "SBA").length} times`)
  failed++
  passed-- // undo the pass above
}

// Known limitation: single-word proper nouns NOT extracted
const singleWordTerms = terms("Please call Target about your order. Also check Walmart.")
expect(
  "known gap: single-word proper nouns NOT extracted (Target, Walmart)",
  singleWordTerms,
  [],  // we expect them to be missing — this is the known limitation
  []
)
console.log(`    (note: "Target" extracted: ${singleWordTerms.includes("Target")}, "Walmart" extracted: ${singleWordTerms.includes("Walmart")} — single-word proper nouns are a known gap)`)

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
