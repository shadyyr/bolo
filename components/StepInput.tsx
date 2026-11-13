"use client"

import { useEffect, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { AlertCircle } from "lucide-react"
import type { EmailMode, InputStyle, SupportedLanguage } from "@/types"
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
  inputStyle: InputStyle
  onInputStyleChange: (style: InputStyle) => void
  userInput: string
  onUserInputChange: Dispatch<SetStateAction<string>>
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

const ENGLISH_PLACEHOLDERS: Record<EmailMode, string> = {
  reply: "Write your reply in your own English. Don't worry about grammar or spelling…",
  compose: "Write in your own English: who you are writing to and what you want to say…",
}

const INPUT_STYLES: { value: InputStyle; label: string; sub: string }[] = [
  { value: "native", label: "In my language", sub: "English words are fine" },
  { value: "english", label: "In my English", sub: "Grammar doesn't matter" },
]

export default function StepInput({
  mode,
  emailContext,
  importantTerms,
  language,
  onLanguageChange,
  inputStyle,
  onInputStyleChange,
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

  const isEnglishStyle = inputStyle === "english"
  const allPlaceholders = isEnglishStyle
    ? [ENGLISH_PLACEHOLDERS[mode]]
    : PLACEHOLDER_ORDER.map((lang) => PLACEHOLDERS[mode][lang])

  useEffect(() => {
    // Nothing to rotate through when there is a single placeholder
    if (allPlaceholders.length < 2) return
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
    onUserInputChange((prev) => (prev ? prev + " " + text : text))
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
        body: JSON.stringify({ emailContext, importantTerms, userInput, language, mode, inputStyle }),
      })

      const data: { email?: string; model?: string; error?: string } = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? "We couldn't write your email. Please try again.")
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
            <p className="text-sm font-semibold text-stone-700">
              Writing your email
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              {isEnglishStyle
                ? "Turning your words into professional English…"
                : isReply
                  ? "Translating your reply into professional English…"
                  : "Turning your message into a professional English email…"}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-stone-900">
            {isReply ? "Write your reply" : "Write your email"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-500">
            {isReply
              ? "Tell us what you want to say, in your language or in your own English. We'll write the professional English email."
              : "Describe who you're writing to and what you want to say. We'll write it in professional English."}
          </p>
        </div>

        <div className="space-y-2">
          <p id="input-style-label" className="text-xs font-semibold text-stone-500">How do you want to say it?</p>
          <div role="radiogroup" aria-labelledby="input-style-label" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {INPUT_STYLES.map((style) => {
              const selected = inputStyle === style.value
              return (
                <button
                  key={style.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onInputStyleChange(style.value)}
                  className={`flex flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-all ${
                    selected
                      ? "bg-teal-800 border-teal-800 text-white shadow-sm"
                      : "bg-white border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  <span className="text-sm font-semibold leading-tight">{style.label}</span>
                  <span className={`text-xs ${selected ? "text-teal-200" : "text-stone-400"}`}>{style.sub}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-500">
            {isEnglishStyle ? "Your first language" : "Your language"}
          </p>
          <LanguageSelector value={language} onChange={onLanguageChange} />
          {isEnglishStyle && (
            <p className="text-xs leading-relaxed text-stone-400">
              If you don&apos;t know a word in English, use the word from your language. We&apos;ll understand it.
            </p>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-6">
          <TabsList variant="line" className="w-full justify-start gap-0 border-b border-stone-200">
            {(["type", "speak"] as Tab[]).map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="flex-none px-5 py-2.5 text-sm font-semibold text-stone-400 after:bottom-0 after:h-0.5 after:bg-teal-700 hover:text-stone-600 data-active:text-teal-700"
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
                  {allPlaceholders[placeholderIdx % allPlaceholders.length]}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="speak">
            <div className="space-y-4">
              <VoiceInput language={language} inputStyle={inputStyle} onTranscript={handleTranscript} />
              {userInput && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-stone-500">What you said (you can edit it)</p>
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
            Write my email
          </Button>
        </div>
      </div>
    </div>
  )
}
