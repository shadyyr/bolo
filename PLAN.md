# Bolo — Project Context & Continuation Plan

## What This App Is

**Bolo** is a web app for immigrant business owners who understand English well but struggle to write professional emails in it. Users upload screenshots of an email they need to reply to, then speak or type their response in their native language. Bolo translates their intent and generates a polished professional English email.

### Core User Flow
1. **Upload** — drag/drop up to 3 email screenshots
2. **Review** — OCR extracts the email text; user can correct any misreads before continuing
3. **Write** — select language (Bangla or Spanish), then type or speak their intended reply in that language
4. **Email** — AI generates a professional English email; user can copy it, edit it inline, or refine it by typing/speaking what to change

### The Key Problem This Solves
Users often embed English words from the original email while speaking their native language — because those words (product names, order numbers, legal terms, program names) have no direct translation. The system must recognize these as intentional cross-language references, not errors. This is handled via an `importantTerms` array extracted from the email screenshots, which is fed into the generation prompt so the AI understands what English terms the user may reference.

---

## Current State

The MVP is fully built and working. All files are in `c:\Users\shade\OneDrive\Documents\bolo`.

### Tech Stack
- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Tesseract.js** — local OCR (runs on the server, zero AI tokens for image reading)
- **AI adapter pattern** — provider-agnostic; swap between Gemini, OpenAI, and Claude via env vars with no code changes
- **Web Speech API** — browser-native voice input

---

## File Structure

```
bolo/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # "use client" — wizard state machine (upload → context → input → review)
│   ├── globals.css
│   └── api/
│       ├── extract-email/route.ts  # OCR images → AI text call → structured JSON
│       ├── generate-email/route.ts # AI generates professional English email
│       └── refine-email/route.ts   # AI refines generated email
├── components/
│   ├── StepUpload.tsx              # Drag/drop upload, client-side image processing
│   ├── StepContext.tsx             # Editable extracted email text (guards against OCR errors)
│   ├── StepInput.tsx               # Language selector + type/speak input
│   ├── StepReview.tsx              # View, copy, inline-edit, and refine generated email
│   ├── VoiceInput.tsx              # Web Speech API voice recorder
│   └── LanguageSelector.tsx        # বাংলা / Español toggle
├── lib/
│   ├── ocr.ts                      # Tesseract.js — extracts text from image buffers
│   └── ai/
│       ├── index.ts                # Provider router — reads AI_PROVIDER from env
│       ├── types.ts                # AIAdapter interface
│       ├── prompts.ts              # All prompt builders (extract, extractFromText, generate, refine)
│       ├── gemini.ts               # Gemini adapter (@google/genai)
│       ├── claude.ts               # Claude adapter (@anthropic-ai/sdk)
│       └── openai.ts               # OpenAI adapter (openai)
├── types/
│   └── index.ts                    # Shared TypeScript types
├── .env.local                      # Not committed — contains real API keys
├── .env.example                    # Committed — shows required env vars
└── PLAN.md                         # This file
```

---

## Environment Variables

`.env.local` (never committed):
```
AI_PROVIDER=gemini
AI_MODEL=gemini-2.0-flash-lite
GEMINI_API_KEY=your-key-here
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

To switch providers: change `AI_PROVIDER` and `AI_MODEL`, add the matching key. No code changes needed.

**Getting a Gemini key:** [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — must use an AI Studio key, NOT a Google Cloud Console key. Cloud Console keys have a free-tier quota of 0.

---

## Key Architectural Decisions & Why

### 1. Tesseract.js for OCR (not AI vision)
**Decision:** Run Tesseract.js locally on the server to extract text from screenshots, then send only that text to the AI.

**Why:** AI vision calls count image tokens (~1,000–1,500 per screenshot), which are expensive and eat into free-tier quotas fast. Tesseract is free, runs locally, and email screenshots are clean high-contrast text that OCR handles well. This cut per-session AI token usage by ~75%.

**Flow:** `image → Tesseract.js (free, local) → raw text → AI text call (cheap) → structured JSON`

### 2. AI Adapter Pattern
**Decision:** All three AI providers (Gemini, Claude, OpenAI) implement a shared `AIAdapter` interface in `lib/ai/`.

**Why:** Started with Gemini (cheapest), hit quota issues during dev, needed to swap providers quickly. The adapter pattern means zero code changes to switch — just update two env vars.

**Interface methods:**
- `extractEmail(images)` — vision-based extraction (still available but not used in current flow)
- `extractEmailFromText(rawText)` — text-based extraction (current default, called after Tesseract OCR)
- `generateEmail(params)` — generates the English email
- `refineEmail(params)` — refines the generated email

### 3. Gemini 2.0 Flash Lite as Default
**Decision:** Default to `gemini-2.0-flash-lite`, not Sonnet or GPT-4o.

**Why:** Has a free tier via AI Studio. $0.10/$0.40 per million tokens on paid. At ~500 input tokens per AI call (after OCR), each session costs a fraction of a cent even on paid. `gemini-2.5-flash-lite` was tried first but returned 503 errors due to preview model demand spikes.

**Privacy note:** Gemini's free tier may use data to improve Google's models. Before handling real business emails in production, switch to the paid tier or a different provider.

### 4. importantTerms for Cross-Language Reference Handling
**Decision:** The extraction step returns an `importantTerms` string array alongside the email text. These terms are injected into the generation prompt.

**Why:** A Bengali speaker replying to an email about a "Student Scholar Program" might say "Scholar Program টা নিয়ে" (mixing English into Bengali). Without context, the AI might not recognize "Scholar Program" as a reference to the email. The `importantTerms` list tells the generation prompt exactly which English words the user might borrow, so it treats them as intentional, not as errors.

### 5. Stateless MVP (No Auth/DB)
**Decision:** No login, no saved history. All state lives in React `useState` in `app/page.tsx`.

**Why:** Fastest path to a working product. Auth can be added later; the plan is to add user accounts once the core flow is validated.

### 6. Web Speech API for Voice
**Decision:** Use the browser's built-in SpeechRecognition API, not a paid transcription service.

**Why:** Free, no extra API key. Supports Bengali (bn-BD) and Spanish (es). Treated as a convenience feature, not a hard dependency — typed input is the reliable path. Graceful fallback message shown if the browser doesn't support it.

**Language codes:** `{ bn: "bn-BD", es: "es" }`

### 7. Fixed Language Set (Bangla + Spanish)
**Decision:** Two supported languages for MVP: Bangla and Spanish.

**Why:** Scoped to validate the concept before adding dynamic language detection. Future plan is to move to dynamic (AI detects whatever language the user speaks/types).

---

## Shared Types (`types/index.ts`)

```typescript
export type SupportedLanguage = "bn" | "es"

export type UploadedImage = {
  data: string          // base64, no data URI prefix
  mediaType: "image/png" | "image/jpeg" | "image/webp"
  name?: string
}

export type Step = "upload" | "context" | "input" | "review"

export type ExtractedEmailContext = {
  context: string
  detectedDetails: {
    sender?: string
    recipient?: string
    subject?: string
    importantTerms: string[]
    dates: string[]
    orderNumbers: string[]
    requestedAction?: string
  }
}

export interface GenerateEmailParams {
  emailContext: string
  importantTerms: string[]
  userInput: string
  language: SupportedLanguage
}

export interface RefineEmailParams {
  currentEmail: string
  refinement: string
  emailContext: string
}
```

---

## API Routes

All routes have `export const runtime = "nodejs"` and return `{ error: string }` on failure (actual error message, not a generic one).

### POST /api/extract-email
1. Validates images (max 3, supported media types only)
2. Runs Tesseract.js OCR on each image → concatenates raw text with `---` separators
3. Sends raw text to AI (text-only, no vision) → returns `ExtractedEmailContext` JSON
4. JSON parse retry: if AI returns malformed JSON, sends one retry asking it to fix it

### POST /api/generate-email
Accepts `{ emailContext, importantTerms, userInput, language }`. Validates all fields (userInput max 5000 chars, language must be "bn" or "es"). Returns `{ email: string }`.

### POST /api/refine-email
Accepts `{ currentEmail, refinement, emailContext }`. Language-agnostic — the refinement instruction can be in English, Bangla, or Spanish. Refinement max 2000 chars. Returns `{ email: string }`.

---

## Prompt Strategy

### Extraction (text-based, post-OCR)
Tells the AI it's receiving OCR output and must structure it into JSON. Critical rule baked into prompt: **copy text exactly as it appears — no auto-correction of any word**, especially proper nouns and company names. Without this, Gemini silently "corrected" "Limbitless" (a real company name) to "Limitless".

### Generation (cross-language aware)
```
ORIGINAL EMAIL THREAD: {emailContext}
KEY TERMS: {importantTerms}
USER INPUT ({language}): {userInput}

Instructions:
- Treat English words matching key terms as intentional references
- Write professional English email with greeting and sign-off
- Match formality of original thread
- Do NOT invent names, prices, dates, or promises not in thread/input
- If input is incomplete, write best version — don't ask follow-ups
```

### Refinement
Language-agnostic: tells AI the instruction may be in English, Bangla, or Spanish. Same no-hallucination rule. Returns full updated email only, no commentary.

---

## Image Handling (Client-Side, StepUpload.tsx)

`prepareImage()` function:
1. Draw to hidden `<canvas>`, scale down if either dimension exceeds 2000px
2. Re-export in **original format** (PNG/WebP) if size is acceptable
3. Only convert to JPEG at 85% quality if still over size limit after resize
4. **Reason:** Heavy JPEG compression degrades text clarity and hurts Tesseract OCR accuracy
5. Reject images over 8MB after processing with a clear error

---

## VoiceInput Implementation Notes

Three bugs fixed that must not be regressed:

**1. Recording stops immediately**
- Root cause: `onTranscript` was in the `useEffect` dependency array. Every parent re-render created a new function reference → effect re-ran → recognition instance recreated mid-recording.
- Fix: Store `onTranscript` in a `useRef` (`onTranscriptRef`), update it on every render via a separate tiny effect. Main effect only depends on `[language]`.

**2. Browser auto-stops mid-recording**
- Root cause: Chrome fires `onend` after brief silences even with `continuous: true`.
- Fix: `intendedStopRef` (boolean ref). Set to `false` on Start, `true` on Stop. In `onend`: if `intendedStopRef.current` is `false`, call `rec.start()` again to resume.

**3. Silent mic failures**
- Root cause: No `onerror` handler. Permission denied, no mic found, or network error all silently fired `onend`, triggering the auto-restart loop forever.
- Fix: `onerror` handler sets `intendedStopRef.current = true` (breaks loop) and shows a descriptive error message. Error codes handled: `not-allowed`, `audio-capture`, `network`. `no-speech` and `aborted` are silent (expected).

---

## Known Issues Fixed

| Issue | Root Cause | Fix Applied |
|---|---|---|
| Recording stops immediately | `onTranscript` in useEffect deps | Store in ref, remove from deps |
| Recording loops but picks up nothing | Browser fires `onend` on silence | Auto-restart unless `intendedStop` |
| Silent mic failures | No `onerror` handler | Added handler with descriptive messages |
| AI auto-corrects "Limbitless" → "Limitless" | AI treating OCR text as editable | Explicit no-auto-correct rule in prompt |
| Gemini 503 errors | `gemini-2.5-flash-lite` preview overload | Switch to `gemini-2.0-flash-lite` |
| Gemini 429 quota errors (image tokens) | Vision calls on free tier | Replaced with Tesseract OCR + text-only AI |
| Generic "Failed to extract" error | Catch block swallowed real error | Return `err.message` directly |
| `npm` blocked in PowerShell | Windows execution policy | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |

---

## What's Not Built Yet (Future Scope)

- **User accounts / auth** — save email history and language preferences across sessions
- **Dynamic language detection** — detect whatever language the user speaks instead of a fixed selector
- **IP-based rate limiting** — needed before any public deployment
- **Upgrade Gemini to paid tier** — free tier may use data for model training; required before handling real customer emails
- **More languages** — Hindi, Tagalog, Arabic, Vietnamese, etc.
- **Mobile-optimized UI** — current layout works on mobile but wasn't specifically optimized

---

## Running the Project

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**First run note:** Tesseract.js downloads a ~10MB WASM binary and English language pack on first use. After that it's cached and fast (1–3 seconds per image). The loading spinner in StepUpload covers this.

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "@google/genai": "^1",
    "@anthropic-ai/sdk": "^0.39",
    "openai": "latest",
    "tesseract.js": "^5"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "postcss": "^8"
  }
}
```
