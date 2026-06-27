"use client"

import { useEffect, useRef, useState } from "react"
import type { SupportedLanguage } from "@/types"

// Minimal types for the Web Speech API (not in standard TypeScript DOM lib)
interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: { readonly transcript: string }
}

interface SpeechRecognitionResultList {
  readonly length: number
  readonly resultIndex: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance
}

interface Props {
  language: SupportedLanguage
  onTranscript: (text: string) => void
}

const LANG_CODES: Record<SupportedLanguage, string> = {
  bn: "bn-BD",
  es: "es",
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was denied. Please allow microphone access in your browser and try again.",
  "audio-capture": "No microphone was found. Please connect a microphone and try again.",
  "network": "A network error occurred. Make sure you are connected to the internet.",
  "no-speech": "", // silent — just means the user paused; we auto-restart
  "aborted": "",   // silent — user clicked stop
}

export default function VoiceInput({ language, onTranscript }: Props) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const [unsupported, setUnsupported] = useState(false)
  const [recording, setRecording] = useState(false)
  const [interim, setInterim] = useState("")
  const [error, setError] = useState("")
  const finalRef = useRef("")
  // Ref so onend can always call the latest callback without being a useEffect dep
  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])
  // Ref so onend knows whether the user intentionally stopped vs browser auto-stopped
  const intendedStopRef = useRef(false)

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition

    if (!SR) {
      setUnsupported(true)
      return
    }

    const rec = new SR()
    rec.lang = LANG_CODES[language]
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interimText = ""
      let finalText = finalRef.current

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }

      finalRef.current = finalText
      setInterim(interimText)
    }

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      const msg = ERROR_MESSAGES[e.error]
      if (msg === undefined) {
        // Unknown error — show the raw code so the user can report it
        setError(`Microphone error: ${e.error}. Please try again.`)
      } else if (msg !== "") {
        setError(msg)
      }
      // For errors that stop the mic (not just no-speech/aborted), stop recording
      if (e.error !== "no-speech") {
        intendedStopRef.current = true
        setRecording(false)
        setInterim("")
      }
    }

    rec.onend = () => {
      // Some browsers fire onend after a brief silence even with continuous: true.
      // If the user hasn't clicked Stop (and no hard error occurred), restart automatically.
      if (!intendedStopRef.current) {
        try { rec.start() } catch { /* already started */ }
        return
      }

      setRecording(false)
      setInterim("")
      if (finalRef.current.trim()) {
        onTranscriptRef.current(finalRef.current.trim())
        finalRef.current = ""
      }
    }

    recognitionRef.current = rec
  }, [language])

  if (unsupported) {
    return (
      <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-lg p-3">
        Voice input is not supported in this browser. Please use text input instead.
      </p>
    )
  }

  function startRecording() {
    finalRef.current = ""
    setInterim("")
    setError("")
    intendedStopRef.current = false
    recognitionRef.current?.start()
    setRecording(true)
  }

  function stopRecording() {
    intendedStopRef.current = true
    recognitionRef.current?.stop()
  }

  return (
    <div className="space-y-3">
      <button
        onClick={recording ? stopRecording : startRecording}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
          recording
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-teal-800 text-white hover:bg-teal-700"
        }`}
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        <span
          className={`w-2 h-2 rounded-full bg-white ${recording ? "mic-pulse" : ""}`}
        />
        {recording ? "Stop recording" : "Start recording"}
      </button>

      {error && (
        <div className="flex gap-2.5 items-start text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {(recording || interim) && !error && (
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 min-h-[56px]">
          {interim || <span className="text-stone-400 italic">Listening…</span>}
        </div>
      )}

      <p className="text-xs text-stone-400">
        Voice recognition runs in your browser and depends on your browser&apos;s speech service.
      </p>
    </div>
  )
}
