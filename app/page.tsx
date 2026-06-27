"use client"

import { useState } from "react"
import type { EmailMode, Step, SupportedLanguage } from "@/types"
import StepUpload from "@/components/StepUpload"
import StepContext from "@/components/StepContext"
import StepInput from "@/components/StepInput"
import StepReview from "@/components/StepReview"

const REPLY_STEPS: Step[] = ["upload", "context", "input", "review"]
const COMPOSE_STEPS: Step[] = ["input", "review"]

const STEP_LABELS: Record<Step, string> = {
  upload: "Upload",
  context: "Review",
  input: "Write",
  review: "Email",
}

export default function Home() {
  const [mode, setMode] = useState<EmailMode | null>(null)
  const [step, setStep] = useState<Step>("upload")
  const [emailContext, setEmailContext] = useState("")
  const [importantTerms, setImportantTerms] = useState<string[]>([])
  const [language, setLanguage] = useState<SupportedLanguage>("bn")
  const [generatedEmail, setGeneratedEmail] = useState("")
  const [lastModel, setLastModel] = useState("")

  function resetAll() {
    setMode(null)
    setStep("upload")
    setEmailContext("")
    setImportantTerms([])
    setGeneratedEmail("")
    setLastModel("")
  }

  function selectMode(m: EmailMode) {
    setMode(m)
    setStep(m === "compose" ? "input" : "upload")
    setEmailContext("")
    setImportantTerms([])
    setGeneratedEmail("")
    setLastModel("")
  }

  const activeSteps = mode === "compose" ? COMPOSE_STEPS : REPLY_STEPS
  const currentStepIndex = activeSteps.indexOf(step)

  return (
    <main className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-800 flex items-center justify-center">
              <span className="text-white text-sm font-bold" style={{ fontFamily: "var(--font-dm-sans)" }}>B</span>
            </div>
            <div>
              <span className="text-lg font-bold text-stone-900" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Bolo
              </span>
              <span className="ml-2 text-xs text-stone-400 font-medium tracking-wide uppercase">
                Email Assistant
              </span>
            </div>
          </div>
          {mode !== null && (
            <button
              onClick={resetAll}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Start over
            </button>
          )}
        </div>
      </header>

      {/* Step indicator — only shown after mode is chosen */}
      {mode !== null && (
        <div className="bg-white border-b border-stone-100">
          <div className="max-w-2xl mx-auto px-5 py-4">
            <div className="flex items-center">
              {activeSteps.map((s, i) => (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    {/* Diamond stamp marker */}
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      <div
                        className={`w-3.5 h-3.5 rotate-45 transition-all duration-300 ${
                          i < currentStepIndex
                            ? "bg-teal-700"
                            : i === currentStepIndex
                              ? "bg-amber-400 shadow-[0_0_0_3px_#fef3c7]"
                              : "bg-stone-200"
                        }`}
                      />
                      {i < currentStepIndex && (
                        <span className="absolute text-white text-[8px] font-bold">✓</span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-medium tracking-wide ${
                        i === currentStepIndex
                          ? "text-amber-600"
                          : i < currentStepIndex
                            ? "text-teal-700"
                            : "text-stone-400"
                      }`}
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {STEP_LABELS[s]}
                    </span>
                  </div>
                  {i < activeSteps.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-3 mb-5 transition-colors duration-300 ${
                        i < currentStepIndex
                          ? "bg-teal-700"
                          : "border-t border-dashed border-stone-300"
                      }`}
                      style={i >= currentStepIndex ? { background: "none" } : {}}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {mode === null ? (
          /* Mode selector landing */
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Write professional emails in English
              </h1>
              <p className="text-stone-500 text-sm">
                Tell us what you want to say in Bangla or Spanish — we&apos;ll write it for you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Reply card */}
              <button
                onClick={() => selectMode("reply")}
                className="group text-left p-6 bg-white border-2 border-stone-200 rounded-2xl hover:border-teal-700 hover:shadow-md transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
                  <svg className="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </div>
                <h2 className="font-bold text-stone-900 text-base mb-1.5" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Reply to an email
                </h2>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Upload a screenshot of the email you received, then tell us what you want to say.
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-teal-700">
                  Get started →
                </span>
              </button>

              {/* Compose card */}
              <button
                onClick={() => selectMode("compose")}
                className="group text-left p-6 bg-white border-2 border-stone-200 rounded-2xl hover:border-teal-700 hover:shadow-md transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="font-bold text-stone-900 text-base mb-1.5" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Write a new email
                </h2>
                <p className="text-sm text-stone-500 leading-relaxed">
                  No screenshots needed. Just describe who you&apos;re writing to and what you want to say.
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-teal-700">
                  Get started →
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* Step card */
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 fade-up" key={step}>
              {step === "upload" && (
                <StepUpload
                  onAnalyzed={(ctx, terms) => {
                    setEmailContext(ctx)
                    setImportantTerms(terms)
                    setStep("context")
                  }}
                />
              )}

              {step === "context" && (
                <StepContext
                  emailContext={emailContext}
                  onConfirm={(edited) => {
                    setEmailContext(edited)
                    setStep("input")
                  }}
                  onBack={() => setStep("upload")}
                />
              )}

              {step === "input" && (
                <StepInput
                  mode={mode}
                  emailContext={emailContext}
                  importantTerms={importantTerms}
                  language={language}
                  onLanguageChange={setLanguage}
                  onGenerate={(email, model) => {
                    setGeneratedEmail(email)
                    setLastModel(model)
                    setStep("review")
                  }}
                  onBack={() => mode === "compose" ? setMode(null) : setStep("context")}
                />
              )}

              {step === "review" && (
                <StepReview
                  email={generatedEmail}
                  emailContext={emailContext}
                  language={language}
                  initialModel={lastModel}
                  onRefined={(email, model) => {
                    setGeneratedEmail(email)
                    setLastModel(model)
                  }}
                  onBack={() => setStep("input")}
                  onStartOver={resetAll}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
