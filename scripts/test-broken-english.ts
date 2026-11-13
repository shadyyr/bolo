/**
 * Integration tests for the "English" input style: the user writes imperfect
 * English, sometimes with words from their own language mixed in, and the
 * generated email must say what they meant in correct English.
 *
 * Requires dev server running: npm run dev
 * Run with: npx tsx scripts/test-broken-english.ts
 */

const BASE = "http://localhost:3000"

let passed = 0
let failed = 0

async function generate(userInput: string, language: "bn" | "es" | "gu", emailContext = "", importantTerms: string[] = []) {
  const mode = emailContext ? "reply" : "compose"
  const res = await fetch(`${BASE}/api/generate-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userInput, language, emailContext, importantTerms, mode, inputStyle: "english" }),
  })
  const data = await res.json() as { email?: string; error?: string }
  if (!res.ok || data.error) throw new Error(data.error ?? "API error")
  return data.email!
}

// mustContain entries are matched case-insensitively; an array entry passes
// when any one of its alternatives appears
async function test(
  label: string,
  input: { text: string; language: "bn" | "es" | "gu"; context?: string; terms?: string[] },
  mustContain: (string | string[])[],
  mustNotContain: string[] = []
) {
  try {
    const email = await generate(input.text, input.language, input.context, input.terms)
    const lower = email.toLowerCase()
    const missing = mustContain.filter((t) =>
      Array.isArray(t) ? !t.some((alt) => lower.includes(alt.toLowerCase())) : !lower.includes(t.toLowerCase())
    )
    const present = mustNotContain.filter((t) => lower.includes(t.toLowerCase()))
    if (missing.length === 0 && present.length === 0) {
      console.log(`  ✓ ${label}`)
      passed++
    } else {
      console.log(`  ✗ ${label}`)
      if (missing.length) console.log(`      missing from email: ${missing.map((m) => (Array.isArray(m) ? m.join(" | ") : m)).join(", ")}`)
      if (present.length) console.log(`      should NOT appear: ${present.join(", ")}`)
      console.log(`      email: ${email.slice(0, 300)}...`)
      failed++
    }
  } catch (e) {
    console.log(`  ✗ ${label}: ${e}`)
    failed++
  }
}

async function run() {
  console.log("\n── Broken-English input tests ──\n")
  console.log("(each test makes one API call — may take a few seconds each)\n")

  await test(
    "fixes grammar and keeps the facts (compose)",
    { text: "I order 20 box gloves from Costco last week but still no come. Order number is 48213. Please tell when it coming.", language: "bn" },
    ["Costco", "48213", "gloves"],
    ["no come", "20 box gloves", "when it coming"]
  )

  await test(
    "translates Bengali words in native script",
    { text: "Hello, my shop দোকান will be বন্ধ on Friday because of family wedding. Please deliver the rice on Saturday.", language: "bn" },
    [["closed", "close"], "Friday", "Saturday", "rice"],
    ["দোকান", "বন্ধ"]
  )

  await test(
    "translates romanized Gujarati words",
    { text: "Sir my dukan rent I will pay kale, today bank is closed. Sorry for late.", language: "gu" },
    ["rent", "tomorrow", ["shop", "store"]],
    ["dukan", "kale"]
  )

  await test(
    "translates Spanish words mixed in",
    { text: "The factura you send me is wrong, the price is more high than we agree. Please send new one.", language: "es" },
    ["invoice", "price"],
    ["factura", "more high"]
  )

  await test(
    "reply mode: uses thread context and corrects a misspelled key term",
    {
      text: "Tell him yes I can come Tuesday for the inspecshun but only after 2 because morning I have delivery.",
      language: "bn",
      context: "From: Mark Evans\nSubject: Fire safety inspection\n\nHi, we need to schedule the annual fire safety inspection for your store. Are you available Tuesday or Wednesday next week?\n\nMark Evans\nCity Fire Department",
      terms: ["fire safety inspection", "City Fire Department"],
    },
    ["Tuesday", "inspection", "2"],
    ["inspecshun", "Wednesday"]
  )

  await test(
    "does not invent details the user never gave",
    { text: "I want ask landlord fix the heater, it broken many days and very cold in shop.", language: "gu" },
    ["heater"],
    ["$", "order number", "invoice"]
  )

  console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`)
  if (failed > 0) process.exit(1)
}

run().catch((e) => {
  console.error("Fatal error:", e.message)
  process.exit(1)
})
