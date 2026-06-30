/**
 * Comprehensive tests for English words embedded in native-language input.
 * Tests the full pipeline: compose prompt → Gemini → generated email.
 *
 * Requires dev server: npm run dev
 * Run with: npx tsx scripts/test-english-mixing.ts
 */

const BASE = "http://localhost:3000"
let passed = 0
let failed = 0
let total = 0

async function generate(userInput: string, language: "bn" | "es" | "gu", emailContext = "", importantTerms: string[] = []) {
  const mode = emailContext ? "reply" : "compose"
  const res = await fetch(`${BASE}/api/generate-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userInput, language, emailContext, importantTerms, mode }),
  })
  const data = await res.json() as { email?: string; error?: string }
  if (!res.ok || data.error) throw new Error(data.error ?? "API error")
  return data.email!
}

function check(label: string, email: string, mustContain: string[], mustNotContain: string[] = []) {
  total++
  const lower = email.toLowerCase()
  const missing = mustContain.filter(t => !lower.includes(t.toLowerCase()))
  const present = mustNotContain.filter(t => lower.includes(t.toLowerCase()))
  if (missing.length === 0 && present.length === 0) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.log(`  ✗ ${label}`)
    if (missing.length) console.log(`      MISSING: ${missing.join(", ")}`)
    if (present.length) console.log(`      SHOULD NOT APPEAR: ${present.join(", ")}`)
    console.log(`      email snippet: ${email.slice(0, 180).replace(/\n/g, " ")}`)
    failed++
  }
}

async function test(label: string, input: string, lang: "bn" | "es" | "gu", mustContain: string[], mustNotContain: string[] = [], ctx = "", terms: string[] = []) {
  try {
    const email = await generate(input, lang, ctx, terms)
    check(label, email, mustContain, mustNotContain)
  } catch (e) {
    total++
    failed++
    console.log(`  ✗ ${label} — API error: ${e}`)
  }
}

async function run() {
  console.log("\n── English mixing in native-language input — comprehensive tests ──\n")

  // ── Single brand names (Bengali) ──
  console.log("Single brand names — Bengali:")
  await test(
    "Walmart named as recipient",
    "Walmart manager কে একটা email পাঠাতে চাই, আমাদের store এ কিছু product stock করতে চাই",
    "bn", ["walmart"]
  )
  await test(
    "Home Depot named as recipient",
    "Home Depot কে email করতে চাই, আমার bulk order এর জন্য discount চাই",
    "bn", ["home depot"]
  )
  await test(
    "FedEx named in complaint",
    "FedEx আমার package হারিয়ে ফেলেছে, তাদের claim করতে চাই",
    "bn", ["fedex"]
  )

  // ── Multiple English terms in one sentence ──
  console.log("\nMultiple English terms in one sentence — Bengali:")
  await test(
    "two brands in one sentence",
    "Amazon এবং Walmart দুটোতেই order দিয়েছি কিন্তু কোনোটাই deliver হয়নি",
    "bn", ["amazon", "walmart"]
  )
  await test(
    "brand + department",
    "Target HR department কে email করতে চাই একটা job application এর বিষয়ে",
    "bn", ["target", "hr"]
  )
  await test(
    "brand + product name",
    "Apple Store এ আমার iPhone repair এর status জানতে চাই",
    "bn", ["apple", "iphone"]
  )

  // ── English at different positions in sentence ──
  console.log("\nEnglish term position — Bengali:")
  await test(
    "English at very start of input",
    "PayPal আমার account freeze করেছে, আমি কিছু করতে পারছি না",
    "bn", ["paypal"]
  )
  await test(
    "English at end of sentence",
    "আমি একটা complaint করতে চাই, company হলো Costco",
    "bn", ["costco"]
  )
  await test(
    "English in middle of sentence",
    "আমার landlord কে email করতে চাই, আমার QuickBooks account এ কিছু সমস্যা হচ্ছে",
    "bn", ["quickbooks"]
  )

  // ── Prices and numbers ──
  console.log("\nPrices and numbers — Bengali:")
  await test(
    "dollar amount preserved",
    "আমার $500 refund এখনো আসেনি, তারা বলেছিল ৭ দিনের মধ্যে দেবে",
    "bn", ["500"]
  )
  await test(
    "order number preserved",
    "আমার order #78432 টা cancel হয়ে গেছে কিন্তু refund আসেনি",
    "bn", ["78432"]
  )

  // ── Person names ──
  console.log("\nPerson names — Bengali:")
  await test(
    "English person name preserved",
    "Mr. Johnson কে email করতে চাই আমার interview এর ব্যাপারে",
    "bn", ["johnson"]
  )
  await test(
    "full name preserved",
    "Sarah Mitchell কে follow up email পাঠাতে চাই, আমরা last week meeting করেছিলাম",
    "bn", ["sarah", "mitchell"]
  )

  // ── Acronyms in native language ──
  console.log("\nAcronyms — Spanish:")
  await test(
    "IRS named in context",
    "Necesito escribirle al IRS sobre mi declaración de impuestos, hay un error",
    "es", ["irs"]
  )
  await test(
    "LLC in business context",
    "Quiero preguntar sobre los requisitos para registrar una LLC en este estado",
    "es", ["llc"]
  )
  await test(
    "multiple acronyms",
    "Mi negocio necesita hablar con el SBA sobre un préstamo y también con el IRS sobre impuestos",
    "es", ["sba", "irs"]
  )

  // ── Multi-word English phrases ──
  console.log("\nMulti-word English phrases — Spanish:")
  await test(
    "Google My Business",
    "Quiero que me ayuden con mi perfil de Google My Business, no puedo acceder",
    "es", ["google my business"]
  )
  await test(
    "QuickBooks Online",
    "Tengo un problema con QuickBooks Online y necesito soporte técnico",
    "es", ["quickbooks"]
  )

  // ── Gujarati mixed inputs ──
  console.log("\nGujarati mixed inputs:")
  await test(
    "Costco named as recipient",
    "Costco warehouse manager ને email કરવું છે, bulk order માટે quote જોઈએ છે",
    "gu", ["costco"]
  )
  await test(
    "two brands Gujarati",
    "Amazon અને Flipkart બંનેને complaint કરવી છે, order deliver નથી થઈ",
    "gu", ["amazon", "flipkart"]
  )
  await test(
    "dollar amount Gujarati",
    "મારા $1200 refund નથી આવ્યા, PayPal account માં problem છે",
    "gu", ["1200", "paypal"]
  )

  // ── Reply mode: importantTerms flow-through ──
  console.log("\nReply mode — importantTerms preserved:")
  await test(
    "single term from email context used in Bengali reply",
    "Knight Scholarship Program এর জন্য আরেকটু সময় লাগবে, deadline extend করা যাবে কি?",
    "bn",
    ["knight scholarship program"],
    [],
    `From: scholarships@ucf.edu\nSubject: Knight Scholarship Program\nDear Applicant, your application for the Knight Scholarship Program is under review.`,
    ["Knight Scholarship Program"]
  )
  await test(
    "order number from email context referenced in Spanish reply",
    "Sí, el pedido #99321 llegó dañado, quiero que me envíen uno nuevo",
    "es",
    ["99321"],
    [],
    `From: support@shop.com\nSubject: Order #99321 Update\nYour order #99321 has been delivered.`,
    ["99321"]
  )

  // ── Slang / colloquial + English mixing ──
  console.log("\nColloquial native language + English terms:")
  await test(
    "Bengali colloquial with brand name",
    "Uber Eats এর লোক আমার খাবার নষ্ট কইরা দিছে, refund চাই",  // dialectal Bengali
    "bn", ["uber eats"]
  )
  await test(
    "Spanish slang with English term",
    "Oye, el manager de Subway me trató muy mal hoy, quiero quejarme",
    "es", ["subway"]
  )

  // ── Edge: English-only input (should still work) ──
  console.log("\nEdge cases:")
  await test(
    "mostly English input still generates email",
    "I want to email the Amazon customer service about my late delivery",
    "bn", ["amazon"]
  )

  console.log(`\n── Results: ${passed}/${total} passed, ${failed} failed ──\n`)
  if (failed > 0) process.exit(1)
}

run().catch(e => {
  console.error("Fatal:", e.message)
  process.exit(1)
})
