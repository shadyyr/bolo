"use client"

import { useState } from "react"

interface Props {
  emailContext: string
  onConfirm: (editedContext: string) => void
  onBack: () => void
}

export default function StepContext({ emailContext, onConfirm, onBack }: Props) {
  const [context, setContext] = useState(emailContext)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Review extracted email
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Check the text read from your screenshots. Correct any misread names, dates, or numbers before continuing.
        </p>
      </div>

      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        rows={12}
        className="w-full border border-stone-200 rounded-xl p-4 text-sm text-stone-800 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-stone-50"
        spellCheck={false}
      />

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-lg border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => onConfirm(context.trim())}
          disabled={!context.trim()}
          className="px-5 py-2.5 bg-teal-800 text-white rounded-lg font-semibold text-sm hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Looks good →
        </button>
      </div>
    </div>
  )
}
