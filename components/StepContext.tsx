"use client"

import { useState } from "react"

interface Props {
  emailContext: string
  onConfirm: (editedContext: string) => void
  onBack: () => void
}

const HEADER_PREFIX = /^(from|to|cc|bcc|subject|date|sent|received|reply-to):/i
const BODY_GREETING = /^(hi\b|hello\b|dear\b|hey\b|good\s+(morning|afternoon|evening)|to\s+whom)/i

function splitEmailContext(text: string): { header: string; body: string } {
  const lines = text.split("\n")
  let bodyStart = -1

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t === "") continue
    if (HEADER_PREFIX.test(t)) continue
    const wordCount = t.split(/\s+/).filter(Boolean).length
    if (BODY_GREETING.test(t) || wordCount >= 6) {
      bodyStart = i
      break
    }
  }

  if (bodyStart <= 0) return { header: "", body: text.trim() }

  return {
    header: lines.slice(0, bodyStart).join("\n").trim(),
    body: lines.slice(bodyStart).join("\n").trim(),
  }
}

export default function StepContext({ emailContext, onConfirm, onBack }: Props) {
  const { header, body: initialBody } = splitEmailContext(emailContext)
  const [body, setBody] = useState(initialBody)

  const handleConfirm = () => {
    const full = header ? `${header}\n\n${body.trim()}` : body.trim()
    onConfirm(full)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Review extracted email
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Fix any misread names, dates, or numbers in the body below. You can ignore the header section.
        </p>
      </div>

      {header && (
        <div>
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">
            Email header &amp; metadata
          </p>
          <div className="w-full border border-stone-200 rounded-xl px-4 py-3 text-xs text-stone-400 font-mono whitespace-pre-wrap bg-stone-50 leading-relaxed">
            {header}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-stone-600 uppercase tracking-wide mb-1.5">
          Email body
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className="w-full border border-stone-300 rounded-xl p-4 text-sm text-stone-900 font-mono font-semibold resize-y focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-white leading-relaxed"
          spellCheck={false}
        />
      </div>

      <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 text-sm text-teal-800 leading-relaxed">
        <span className="font-semibold">Don&apos;t worry about stray characters.</span>{" "}
        Email apps often leave behind button labels, icons, or status bar text that the scanner picks up. The system automatically filters most of it out — as long as the email body above looks correct, your reply will be written accurately.
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-lg border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={!body.trim()}
          className="px-5 py-2.5 bg-teal-800 text-white rounded-lg font-semibold text-sm hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Looks good →
        </button>
      </div>
    </div>
  )
}
