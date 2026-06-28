"use client"

import { useEffect, useRef, useState } from "react"
import type { EmailMode, SupportedLanguage } from "@/types"
import { detectPromptInjection } from "@/lib/detect-injection"
import LanguageSelector from "./LanguageSelector"
import VoiceInput from "./VoiceInput"

interface Props {
  mode: EmailMode
  emailContext: string
  importantTerms: string[]
  language: SupportedLanguage
  onLanguageChange: (lang: SupportedLanguage) => void
  userInput: string
  onUserInputChange: (input: string) => void
  onGenerate: (email: string, model: string) => void
  onBack: () => void
}

type Tab = "type" | "speak"

const PLACEHOLDER_ORDER: SupportedLanguage[] = ["bn", "es", "gu"]

const PLACEHOLDERS: Record<EmailMode, Record<SupportedLanguage, string>> = {
  reply: {
    bn: "এখানে বাংলায় আপনার উত্তর লিখুন…",
    es: "Escribe tu respuesta aquí en español…",
    gu: "અહીં ગુજરાતીમાં તમારો જવાબ લખો…",
  },
  compose: {
    bn: "বাংলায় লিখুন — কাকে লিখছেন এবং কী বলতে চান…",
    es: "Escribe en español — a quién le escribes y qué quieres decir…",
    gu: "ગુજરાતીમાં લખો — કોને લખો છો અને શું કહેવું છે…",
  },
}

export default function StepInput({
  mode,
  emailContext,
  importantTerms,
  language,
  onLanguageChange,
  userInput,
  onUserInputChange,
  onGenerate,
  onBack,
}: Props) {
  const [tab, setTab] = useState<Tab>("type")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [placeholderVisible, setPlaceholderVisible] = useState(true)
  const placeholderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allPlaceholders = PLACEHOLDER_ORDER.map((lang) => PLACEHOLDERS[mode][lang])

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderVisible(false)
      placeholderTimeoutRef.current = setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % allPlaceholders.length)
        setPlaceholderVisible(true)
      }, 300)
    }, 5000)
    return () => {
      clearInterval(interval)
      if (placeholderTimeoutRef.current) clearTimeout(placeholderTimeoutRef.current)
    }
  }, [allPlaceholders.length])

  const isReply = mode === "reply"

  function handleTranscript(text: string) {
    onUserInputChange(userInput ? userInput + " " + text : text)
  }

  async function handleGenerate() {
    if (!userInput.trim()) return

    const injectionError = detectPromptInjection(userInput)
    if (injectionError) {
      setError(injectionError)
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailContext, importantTerms, userInput, language, mode }),
      })

      const data: { email?: string; model?: string; error?: string } = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to generate email. Please try again.")
        return
      }

      onGenerate(data.email!, data.model ?? "")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
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
              Writing your email
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              {isReply
                ? "Translating your reply into professional English…"
                : "Turning your message into a professional English email…"}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {isReply ? "Write your reply" : "Write your email"}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {isReply
              ? "Tell us what you want to say in your language — we'll write the professional English email."
              : "Describe who you're writing to and what you want to say — we'll write it in professional English."}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Your language</p>
          <LanguageSelector value={language} onChange={onLanguageChange} />
        </div>

        {/* Tabs */}
        <div className="border-b border-stone-200">
          <div className="flex gap-0">
            {(["type", "speak"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  tab === t
                    ? "border-teal-700 text-teal-700"
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {t === "type" ? "Type" : "Speak"}
              </button>
            ))}
          </div>
        </div>

        {tab === "type" ? (
          <div className="relative">
            <textarea
              value={userInput}
              onChange={(e) => onUserInputChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              rows={6}
              className="w-full border border-stone-200 rounded-xl p-4 text-sm text-stone-800 resize-y focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-stone-50"
            />
            {!userInput && !isFocused && (
              <p
                className={`absolute top-4 left-4 right-4 text-sm text-stone-400 pointer-events-none select-none transition-opacity duration-300 ${placeholderVisible ? "opacity-100" : "opacity-0"}`}
              >
                {allPlaceholders[placeholderIdx]}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <VoiceInput language={language} onTranscript={handleTranscript} />
            {userInput && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Transcript (editable)</p>
                <textarea
                  value={userInput}
                  onChange={(e) => onUserInputChange(e.target.value)}
                  rows={4}
                  className="w-full border border-stone-200 rounded-xl p-4 text-sm text-stone-800 resize-y focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-stone-50"
                />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex gap-2.5 items-start text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2.5 rounded-lg border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleGenerate}
            disabled={!userInput.trim() || loading}
            className="px-5 py-2.5 bg-teal-800 text-white rounded-lg font-semibold text-sm hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Generate email →
          </button>
        </div>
      </div>
    </div>
  )
}
