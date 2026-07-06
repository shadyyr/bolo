"use client"

import { useRef, useState } from "react"
import { AlertCircle } from "lucide-react"
import type { SupportedLanguage } from "@/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
  const [copyError, setCopyError] = useState("")
  const [lastModel, setLastModel] = useState(initialModel)
  const emailRef = useRef<HTMLTextAreaElement>(null)

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
    setCopyError("")
    try {
      await navigator.clipboard.writeText(currentEmail)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // navigator.clipboard is unavailable in non-secure contexts and some
      // in-app webviews — select the text so a manual copy is one keystroke,
      // and tell the user instead of failing silently
      emailRef.current?.select()
      setCopyError("Couldn't copy automatically — the email text is selected, press Ctrl+C (or long-press) to copy it.")
    }
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

        <Textarea
          ref={emailRef}
          value={currentEmail}
          onChange={(e) => setCurrentEmail(e.target.value)}
          className="min-h-72"
        />

        {/* Model badge */}
        {lastModel && (
          <Badge
            variant="secondary"
            className="h-auto gap-1.5 rounded-lg border-teal-100 bg-teal-50 px-3 py-2 text-teal-700"
          >
            <span className="font-medium">Written by</span>
            <code className="font-mono font-semibold">{lastModel}</code>
          </Badge>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleCopy}
            className={copied ? "border-teal-200 bg-teal-100 text-teal-800 hover:bg-teal-100" : ""}
          >
            {copied ? "✓ Copied!" : "Copy to clipboard"}
          </Button>
          <Button variant="outline" onClick={() => setRefineOpen((o) => !o)} className="font-semibold text-stone-700">
            {refineOpen ? "Cancel" : "Refine email"}
          </Button>
        </div>

        {copyError && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <AlertDescription className="text-amber-800">{copyError}</AlertDescription>
          </Alert>
        )}

        {refineOpen && (
          <div className="border border-stone-200 rounded-xl p-5 space-y-4 bg-stone-50">
            <p className="text-sm font-semibold text-stone-700" style={{ fontFamily: "var(--font-dm-sans)" }}>
              What would you like to change?{" "}
              <span className="font-normal text-stone-400">(English or your native language)</span>
            </p>

            <Textarea
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              placeholder="e.g. Make it shorter / একটু ছোট করুন"
              className="min-h-24 bg-white p-3"
            />

            <VoiceInput language={language} onTranscript={handleVoiceRefinement} />

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleRefine} disabled={!refinement.trim() || loading}>
              Apply changes
            </Button>
          </div>
        )}

        <div className="flex items-center gap-4 pt-2 border-t border-stone-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-auto p-0 text-sm font-normal text-stone-400 hover:bg-transparent hover:text-stone-600"
          >
            ← Back to input
          </Button>
          <span className="text-stone-200">|</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartOver}
            className="h-auto p-0 text-sm font-normal text-stone-400 hover:bg-transparent hover:text-stone-600"
          >
            Start over
          </Button>
        </div>
      </div>
    </div>
  )
}
