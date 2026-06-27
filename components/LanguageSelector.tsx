"use client"

import type { SupportedLanguage } from "@/types"

interface Props {
  value: SupportedLanguage
  onChange: (lang: SupportedLanguage) => void
}

const LANGUAGES: { value: SupportedLanguage; label: string; sub: string }[] = [
  { value: "bn", label: "বাংলা", sub: "Bengali" },
  { value: "es", label: "Español", sub: "Spanish" },
]

export default function LanguageSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.value}
          onClick={() => onChange(lang.value)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-left transition-all ${
            value === lang.value
              ? "bg-teal-800 border-teal-800 text-white shadow-sm"
              : "bg-white border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50"
          }`}
        >
          <span className="text-base leading-none">{lang.label}</span>
          <span className={`text-xs ${value === lang.value ? "text-teal-200" : "text-stone-400"}`}>
            {lang.sub}
          </span>
        </button>
      ))}
    </div>
  )
}
