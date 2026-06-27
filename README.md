# Bolo — Email Assistant for Immigrant Business Owners

Bolo helps immigrant business owners who understand English well but struggle to write professional emails in it. Users speak or type their intent in Bangla or Spanish, and Bolo produces a polished, professional English email.

## How it works

Bolo supports two modes:

**Reply to an email** — Upload screenshots of an email you received. Bolo extracts the text, lets you correct any misreads, then asks what you want to say in your language. It generates a professional English reply that matches the formality of the original thread.

**Write a new email** — No screenshots needed. Just describe who you're writing to and what you want to say in Bangla or Spanish. Bolo writes the email from scratch.

In both modes, users can speak their response using the built-in voice input or type it. Once the email is generated, it can be copied, edited inline, or refined further by describing what to change — again in any language.

## Key design decisions

- **Local OCR** — Tesseract.js runs on the server to extract text from screenshots. No image tokens are sent to the AI, keeping costs near zero.
- **Rule-based extraction** — Sender, dates, order numbers, and important terms are extracted with regex, not an AI call.
- **Cross-language term handling** — English words embedded in Bangla/Spanish input (product names, order numbers, legal terms) are recognized as intentional references, not translation errors.
- **AI fallback** — Gemini is the primary provider. If it fails (quota, 503), OpenAI takes over automatically with no interruption to the user.

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4
- Tesseract.js for OCR
- Gemini (`gemini-2.5-flash-lite`) as primary AI, OpenAI (`gpt-4o-mini`) as automatic fallback
- Web Speech API for voice input

## Setup

Copy `.env.example` to `.env.local` and fill in your API keys:

```
GEMINI_API_KEY=       # from aistudio.google.com/apikey (AI Studio key, not Cloud Console)
AI_MODEL=gemini-2.5-flash-lite
OPENAI_API_KEY=       # fallback provider
```

Then run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **First run:** Tesseract.js downloads a ~10MB language pack on first use. After that it's cached and runs in 1–3 seconds per image.
