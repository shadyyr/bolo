"use client"

import { useEffect, useRef, useState } from "react"

interface Props {
  emailContext: string
  onConfirm: (editedContext: string) => void
  onBack: () => void
}

const HEADER_PREFIX = /^(from|to|cc|bcc|subject|date|sent|received|reply-to):/i
const BODY_GREETING = /^(hi\b|hello\b|dear\b|hey\b|good\s+(morning|afternoon|evening)|to\s+whom)/i

function findBodyStart(text: string): number {
  const lines = text.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t === "" || HEADER_PREFIX.test(t)) continue
    const wordCount = t.split(/\s+/).filter(Boolean).length
    if (BODY_GREETING.test(t) || wordCount >= 6) return i
  }
  return -1
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function buildHtml(text: string): string {
  const lines = text.split("\n")
  const bodyStart = findBodyStart(text)

  return lines
    .map((line, i) => {
      const content = line ? esc(line) : "<br>"
      // Bold non-empty body lines; plain for header and blank lines everywhere
      if (bodyStart >= 0 && i >= bodyStart && line.trim()) {
        return `<div><b>${content}</b></div>`
      }
      // Blank line between header and body
      if (bodyStart >= 0 && i === bodyStart && !line.trim()) {
        return `<div><br></div>`
      }
      return `<div>${content}</div>`
    })
    .join("")
}

export default function StepContext({ emailContext, onConfirm, onBack }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [hasContent, setHasContent] = useState(!!emailContext.trim())

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = buildHtml(emailContext)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = () => {
    const text = editorRef.current?.innerText ?? ""
    onConfirm(text.trim())
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Review extracted email
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          The <strong>bold text</strong> is the email body — fix any misread words there. You can ignore the gray header lines above it.
        </p>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => setHasContent(!!editorRef.current?.innerText?.trim())}
        className="w-full border border-stone-200 rounded-xl p-4 text-sm text-stone-800 font-mono bg-stone-50 min-h-[18rem] focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent leading-relaxed overflow-y-auto"
        spellCheck={false}
      />

      <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 text-sm text-teal-800 leading-relaxed">
        <span className="font-semibold">Don&apos;t worry about stray characters.</span>{" "}
        Email apps often leave behind button labels, icons, or status bar text that the scanner picks up. The system automatically filters most of it out — as long as the bold body text above looks correct, your reply will be written accurately.
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
          disabled={!hasContent}
          className="px-5 py-2.5 bg-teal-800 text-white rounded-lg font-semibold text-sm hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Looks good →
        </button>
      </div>
    </div>
  )
}
