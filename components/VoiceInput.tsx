"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle } from "lucide-react"
import type { SupportedLanguage } from "@/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

// Records real audio with MediaRecorder and transcribes it server-side
// (Gemini, Whisper fallback) via /api/transcribe-audio.
//
// This replaced the browser Web Speech API on purpose:
// - Web Speech locks each session to ONE language, so it only tolerated a few
//   embedded English words — full English sentences inside native-language
//   speech got garbled or transliterated. Server-side models handle full
//   code-switching natively.
// - Web Speech on iOS Safari needs system Dictation and doesn't support all
//   of our languages. MediaRecorder works everywhere (iOS 14.3+).

interface Props {
  language: SupportedLanguage
  onTranscript: (text: string) => void
}

type RecState = "idle" | "recording" | "transcribing"

const MAX_SECONDS = 180

// Chrome/Firefox record webm/opus; Safari and iOS record mp4 (AAC)
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return ""
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ""
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "")
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

const MIC_ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError: "Microphone access was denied. Please allow microphone access in your browser and try again.",
  NotFoundError: "No microphone was found. Please connect a microphone and try again.",
  NotReadableError: "The microphone is in use by another app. Please close it and try again.",
}

export default function VoiceInput({ language, onTranscript }: Props) {
  const [state, setState] = useState<RecState>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState("")
  const [unsupported, setUnsupported] = useState(false)

  // Refs so async completion (which may outlive this component) always uses
  // the latest callback and language, and never loses a finished recording
  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])
  const languageRef = useRef(language)
  useEffect(() => { languageRef.current = language }, [language])

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setUnsupported(true)
    }
  }, [])

  // Unmount cleanup: stop the timer and mic. If a recording is in flight,
  // stopping the recorder triggers onstop → transcription → delivery through
  // onTranscriptRef, so navigating away never discards what was dictated.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      const rec = recorderRef.current
      if (rec && rec.state !== "inactive") {
        try { rec.stop() } catch { /* already stopped */ }
      } else {
        streamRef.current?.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  async function startRecording() {
    setError("")
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      const name = e instanceof DOMException ? e.name : ""
      setError(MIC_ERROR_MESSAGES[name] ?? "Could not access the microphone. Please try again.")
      return
    }

    const mimeType = pickMimeType()
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 32000, // plenty for speech; keeps uploads tiny
      })
    } catch {
      recorder = new MediaRecorder(stream) // browser default as last resort
    }

    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => { void finishRecording() }

    recorderRef.current = recorder
    streamRef.current = stream
    recorder.start(1000) // flush chunks every second (more robust on iOS)
    startTimeRef.current = Date.now()
    setElapsed(0)
    setState("recording")

    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsed(secs)
      if (secs >= MAX_SECONDS) stopRecording()
    }, 500)
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const rec = recorderRef.current
    if (!rec || rec.state === "inactive") return
    try { rec.stop() } catch { /* already stopped */ } // onstop → finishRecording
  }

  async function finishRecording() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null

    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" })
    chunksRef.current = []

    // A fraction of a second of audio — treat as an accidental tap
    if (blob.size < 2000) {
      setState("idle")
      return
    }

    setState("transcribing")
    try {
      const base64 = await blobToBase64(blob)
      if (base64.length > 4_000_000) {
        setError("That recording was too long to process. Please record a shorter message.")
        setState("idle")
        return
      }

      const res = await fetch("/api/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64,
          mimeType: (blob.type.split(";")[0] || "audio/webm").trim(),
          language: languageRef.current,
        }),
      })
      const data: { text?: string; error?: string } = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? "Couldn't transcribe your recording. Please try again.")
        setState("idle")
        return
      }

      const text = (data.text ?? "").trim()
      // No letters or digits in any script = noise, not speech (Whisper can
      // hallucinate symbols like "🔔" on silence or pure tones)
      if (!/[\p{L}\p{N}]/u.test(text)) {
        setError("We couldn't hear any words in that recording — please try again closer to the microphone.")
        setState("idle")
        return
      }

      onTranscriptRef.current(text)
      setState("idle")
    } catch {
      setError("Something went wrong while transcribing. Please try again or type your message instead.")
      setState("idle")
    }
  }

  if (unsupported) {
    return (
      <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-lg p-3">
        Voice input is not supported in this browser. Please use text input instead.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={state === "recording" ? stopRecording : startRecording}
          disabled={state === "transcribing"}
          className={state === "recording" ? "bg-red-600 text-white hover:bg-red-700" : ""}
        >
          <span className={`w-2 h-2 rounded-full bg-white ${state === "recording" ? "mic-pulse" : ""}`} />
          {state === "recording" ? "Stop recording" : state === "transcribing" ? "Transcribing…" : "Start recording"}
        </Button>

        {state === "recording" && (
          <span className="text-sm font-medium text-stone-500 tabular-nums">
            {formatTime(elapsed)} / {formatTime(MAX_SECONDS)}
          </span>
        )}
      </div>

      {state === "recording" && !error && (
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-600">
          Recording — speak naturally in your language. Mixing in English words or whole
          English sentences is fine; everything will be captured.
        </div>
      )}

      {state === "transcribing" && !error && (
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-500 italic">
          Turning your voice into text…
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-stone-400">
        Your recording is transcribed securely and is not stored.
      </p>
    </div>
  )
}
