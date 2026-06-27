"use client"

import { useState } from "react"
import type { SupportedLanguage } from "@/types"
import VoiceInput from "./VoiceInput"

interface Props {
  email: string
  emailContext: string
  language: SupportedLanguage
  initialModel: string
  onRefined: (email: string, model: string) => void
  onBack: () => void
  onStartOver: () => void
}

export default function StepReview({
  email,
  emailContext,
  language,
  initialModel,
  onRefined,
  onBack,
  onStartOver,
}: Props) {
  const [currentEmail, setCurrentEmail] = useState(email)
  const [refinement, setRefinement] = useState("")
  const [refineOpen, setRefineOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [lastModel, setLastModel] = useState(initialModel)

  function handleVoiceRefinement(text: string) {
    setRefinement((prev) => (prev ? prev + " " + text : text))
  }

  async function handleRefine() {
    if (!refinement.trim()) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/refine-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentEmail, refinement, emailContext }),
      })

      const data: { email?: string; model?: string; error?: string } = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to refine email. Please try again.")
        return
      }

      setCurrentEmail(data.email!)
      setLastModel(data.model ?? lastModel)
      onRefined(data.email!, data.model ?? lastModel)
      setRefinement("")
      setRefineOpen(false)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(currentEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 -m-6 sm:-m-8 bg-white/90 backdrop-blur-sm rounded-2xl z-10 flex flex-col items-center justify-center gap-4">
          <div className="spinner" />
          <div className="text-center">
            <p className="text-sm font-semibold text-stone-700" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Refining your email
            </p>
            <p className="text-xs text-stone-400 mt-0.5">Applying your changes…</p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Your email
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Edit inline, copy, or ask for changes before sending.
          </p>
        </div>

        <textarea
          value={currentEmail}
          onChange={(e) => setCurrentEmail(e.target.value)}
          rows={12}
          className="w-full border border-stone-200 rounded-xl p-4 text-sm text-stone-800 resize-y focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-stone-50"
        />

        {/* Model badge */}
        {lastModel && (
          <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 w-fit">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="font-medium">Generated with</span>
            <code className="font-mono font-semibold">{lastModel}</code>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCopy}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              copied
                ? "bg-teal-100 text-teal-800 border border-teal-200"
                : "bg-teal-800 text-white hover:bg-teal-700"
            }`}
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {copied ? "✓ Copied!" : "Copy to clipboard"}
          </button>
          <button
            onClick={() => setRefineOpen((o) => !o)}
            className="px-5 py-2.5 border border-stone-200 text-stone-700 rounded-lg font-semibold text-sm hover:bg-stone-50 transition-colors"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {refineOpen ? "Cancel" : "Refine email"}
          </button>
        </div>

        {refineOpen && (
          <div className="border border-stone-200 rounded-xl p-5 space-y-4 bg-stone-50">
            <p className="text-sm font-semibold text-stone-700" style={{ fontFamily: "var(--font-dm-sans)" }}>
              What would you like to change?{" "}
              <span className="font-normal text-stone-400">(English, বাংলা, or Español)</span>
            </p>

            <textarea
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              rows={3}
              placeholder="e.g. Make it shorter / একটু ছোট করুন / Hazlo más corto"
              className="w-full border border-stone-200 rounded-xl p-3 text-sm text-stone-800 resize-y focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-white"
            />

            <VoiceInput language={language} onTranscript={handleVoiceRefinement} />

            {error && (
              <div className="flex gap-2.5 items-start text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              onClick={handleRefine}
              disabled={!refinement.trim() || loading}
              className="px-5 py-2.5 bg-teal-800 text-white rounded-lg font-semibold text-sm hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Apply changes
            </button>
          </div>
        )}

        <div className="flex gap-4 pt-2 border-t border-stone-100">
          <button
            onClick={onBack}
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← Back to input
          </button>
          <span className="text-stone-200">|</span>
          <button
            onClick={onStartOver}
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    </div>
  )
}
