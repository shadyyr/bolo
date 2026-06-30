/**
 * Integration tests for mixed-language AI generation.
 * Tests that English words embedded in Bengali/Spanish/Gujarati input
 * are correctly preserved in the generated email.
 *
 * Requires dev server running: npm run dev
 * Run with: npx tsx scripts/test-generation.ts
 */

const BASE = "http://localhost:3000"

let passed = 0
let failed = 0

async function generate(userInput: string, language: "bn" | "es" | "gu", emailContext = "", importantTerms: string[] = []) {
  const mode = emailContext ? "reply" : "compose"
  const res = await fetch(`${BASE}/api/generate-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userInput, language, emailContext, importantTerms, mode }),
  })
  const data = await res.json() as { email?: string; error?: string; model?: string }
  if (!res.ok || data.error) throw new Error(data.error ?? "API error")
  return data.email!
}

function check(label: string, email: string, mustContain: string[], mustNotContain: string[] = []) {
  const emailLower = email.toLowerCase()
  const missing = mustContain.filter(t => !emailLower.includes(t.toLowerCase()))
  const present = mustNotContain.filter(t => emailLower.includes(t.toLowerCase()))
  if (missing.length === 0 && present.length === 0) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.log(`  ✗ ${label}`)
    if (missing.length) console.log(`      missing from email: ${missing.join(", ")}`)
    if (present.length) console.log(`      should NOT appear: ${present.join(", ")}`)
    console.log(`      email: ${email.slice(0, 200)}...`)
    failed++
  }
}

async function run() {
  console.log("\n── AI mixed-language generation tests ──\n")
  console.log("(each test makes one API call — may take a few seconds each)\n")

  // ── Bengali (bn) ──
  console.log("Bengali:")

  try {
    const email = await generate(
      "Target এ আমার order দেওয়া হয়েছিল কিন্তু আজও deliver হয়নি। তাদের customer service কে জিজ্ঞেস করুন কবে আসবে।",
      "bn"
    )
    check(
      "preserves 'Target' from Bengali compose input",
      email,
      ["target"],
      []
    )
    check(
      "produces professional English email structure",
      email,
      ["dear", "sincerely"].filter(w => email.toLowerCase().includes(w)).length > 0
        ? ["dear"]
        : ["to whom"],
      []
    )
  } catch (e) {
    console.log(`  ✗ Bengali Target test failed: ${e}`)
    failed++
  }

  try {
    const email = await generate(
      "Amazon Prime membership cancel করতে চাই। তারা কি refund দেবে?",
      "bn"
    )
    check("preserves 'Amazon Prime' from Bengali compose input", email, ["amazon", "prime"])
  } catch (e) {
    console.log(`  ✗ Bengali Amazon Prime test failed: ${e}`)
    failed++
  }

  try {
    const emailCtx = `From: scholarships@ucf.edu
Subject: Student Scholar Program Award
Dear Applicant, Congratulations! You have been selected for the Student Scholar Program.
Please contact the Financial Aid office to complete your enrollment.`
    const email = await generate(
      "Scholar Program এর জন্য আমাকে select করা হয়েছে। Financial Aid office কে জিজ্ঞেস করুন আমার next step কী।",
      "bn",
      emailCtx,
      ["Student Scholar Program", "Financial Aid"]
    )
    check(
      "preserves importantTerms ('Student Scholar Program', 'Financial Aid') in reply mode",
      email,
      ["scholar program", "financial aid"]
    )
  } catch (e) {
    console.log(`  ✗ Bengali reply with importantTerms test failed: ${e}`)
    failed++
  }

  // ── Spanish (es) ──
  console.log("\nSpanish:")

  try {
    const email = await generate(
      "Quiero hablar con Amazon sobre mi orden. No llegó el paquete y quiero un reembolso.",
      "es"
    )
    check("preserves 'Amazon' from Spanish compose input", email, ["amazon"])
  } catch (e) {
    console.log(`  ✗ Spanish Amazon test failed: ${e}`)
    failed++
  }

  try {
    const email = await generate(
      "Necesito ayuda con mi SBA loan. El banco dice que hay un problema con mi aplicación.",
      "es"
    )
    check("preserves 'SBA' from Spanish compose input", email, ["sba"])
  } catch (e) {
    console.log(`  ✗ Spanish SBA test failed: ${e}`)
    failed++
  }

  // ── Gujarati (gu) ──
  console.log("\nGujarati:")

  try {
    const email = await generate(
      "Target store manager ને email કરવું છે. મારો order ખોટો આવ્યો, return કરવો છે.",
      "gu"
    )
    check("preserves 'Target' from Gujarati compose input", email, ["target"])
  } catch (e) {
    console.log(`  ✗ Gujarati Target test failed: ${e}`)
    failed++
  }

  try {
    const email = await generate(
      "SBA loan માટે apply કર્યું છે. Business plan ready છે. Meeting schedule કરવી છે.",
      "gu"
    )
    check("preserves 'SBA' from Gujarati compose input", email, ["sba"])
  } catch (e) {
    console.log(`  ✗ Gujarati SBA test failed: ${e}`)
    failed++
  }

  // ── Quality checks ──
  console.log("\nQuality (no hallucination):")

  try {
    const email = await generate(
      "কাউকে email করতে চাই আমার দোকানের জন্য একটা meeting এর জন্য।",
      "bn"
    )
    // Vague input — AI should not invent specific dates, prices, names
    const hasHallucination = /\$\d+|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}:\d{2}\s*(am|pm)/i.test(email)
    if (!hasHallucination) {
      console.log("  ✓ does not hallucinate prices, dates, or times for vague input")
      passed++
    } else {
      console.log("  ✗ hallucinated specific details not mentioned in input")
      console.log(`      email: ${email.slice(0, 300)}`)
      failed++
    }
  } catch (e) {
    console.log(`  ✗ hallucination check failed: ${e}`)
    failed++
  }

  console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`)
  if (failed > 0) process.exit(1)
}

run().catch(e => {
  console.error("Fatal error:", e.message)
  process.exit(1)
})
