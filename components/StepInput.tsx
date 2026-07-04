"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle } from "lucide-react"
import type { EmailMode, SupportedLanguage } from "@/types"
import { detectPromptInjection } from "@/lib/detect-injection"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
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
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-6">
          <TabsList variant="line" className="w-full justify-start gap-0 border-b border-stone-200">
            {(["type", "speak"] as Tab[]).map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="flex-none px-5 py-2.5 font-display text-sm font-semibold text-stone-400 after:bottom-0 after:h-0.5 after:bg-teal-700 hover:text-stone-600 data-active:text-teal-700"
              >
                {t === "type" ? "Type" : "Speak"}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="type">
            <div className="relative">
              <Textarea
                value={userInput}
                onChange={(e) => onUserInputChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="min-h-40"
              />
              {!userInput && !isFocused && (
                <p
                  className={`absolute top-4 left-4 right-4 text-sm text-stone-400 pointer-events-none select-none transition-opacity duration-300 ${placeholderVisible ? "opacity-100" : "opacity-0"}`}
                >
                  {allPlaceholders[placeholderIdx]}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="speak">
            <div className="space-y-4">
              <VoiceInput language={language} onTranscript={handleTranscript} />
              {userInput && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Transcript (editable)</p>
                  <Textarea
                    value={userInput}
                    onChange={(e) => onUserInputChange(e.target.value)}
                    className="min-h-28"
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button onClick={handleGenerate} disabled={!userInput.trim() || loading}>
            Generate email →
          </Button>
        </div>
      </div>
    </div>
  )
}
