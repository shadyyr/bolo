"use client"

import { useEffect, useRef, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface Props {
  emailContext: string
  onConfirm: (editedContext: string) => void
  onBack: () => void
}

const HEADER_PREFIX = /^(from|to|cc|bcc|subject|date|sent|received|reply-to):/i
const EMAIL_IN_ANGLE = /<[^>]+@[^>]+>/
const BODY_GREETING = /^(hi\b|hello\b|dear\b|hey\b|good\s+(morning|afternoon|evening)|to\s+whom)/i

function findBodyStart(text: string): number {
  const lines = text.split("\n")
  let lastHeaderLine = -1

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()

    if (t === "") {
      if (lastHeaderLine >= 0) {
        // Blank line ending the header block — skip extra blanks, return first content line
        let j = i + 1
        while (j < lines.length && lines[j].trim() === "") j++
        return j < lines.length ? j : -1
      }
      continue
    }

    if (HEADER_PREFIX.test(t) || EMAIL_IN_ANGLE.test(t)) {
      lastHeaderLine = i
    } else if (lastHeaderLine >= 0) {
      // Non-header line immediately after header lines (no blank separator) = body starts here
      return i
    }
    // Non-header line before any header found (e.g. garbled pre-header) — keep scanning
  }

  // Headers found but file ended without a blank line or non-header
  if (lastHeaderLine >= 0) return lastHeaderLine + 1

  // No formal headers at all — fall back to heuristic
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t === "") continue
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
        <h2 className="text-xl font-bold text-stone-900">
          Check the email text
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-500">
          The <strong>bold text</strong> is the email body. Fix any misread words there, and ignore the gray header lines above it.
        </p>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => setHasContent(!!editorRef.current?.innerText?.trim())}
        className="w-full border border-stone-200 rounded-xl p-4 text-sm text-stone-800 bg-stone-50 min-h-[18rem] focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent leading-relaxed overflow-y-auto"
        spellCheck={false}
      />

      <Alert className="rounded-xl border-teal-100 bg-teal-50 text-teal-800">
        <AlertDescription className="text-sm leading-relaxed text-teal-800">
          <span className="font-semibold">Don&apos;t worry about stray characters.</span>{" "}
          Email apps often leave behind button labels, icons, or status bar text that the scanner picks up. Bolo filters most of it out. As long as the bold body text above looks correct, your reply will be written accurately.
        </AlertDescription>
      </Alert>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={handleConfirm} disabled={!hasContent}>
          Use this text
        </Button>
      </div>
    </div>
  )
}
