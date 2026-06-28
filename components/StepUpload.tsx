"use client"

import { useEffect, useRef, useState } from "react"
import type { ExtractedEmailContext, UploadedImage } from "@/types"

interface Props {
  onAnalyzed: (context: string, importantTerms: string[]) => void
  onBack: () => void
}

const MAX_IMAGES = 3
const MAX_SIZE_BYTES = 8 * 1024 * 1024
const MAX_DIM = 2000

async function prepareImage(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      const needsResize = width > MAX_DIM || height > MAX_DIM

      if (!needsResize) {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          const base64 = dataUrl.split(",")[1]
          const sizeBytes = Math.ceil((base64.length * 3) / 4)

          if (sizeBytes > MAX_SIZE_BYTES) {
            compressToJpeg(img, width, height, resolve, file.name)
          } else {
            resolve({
              data: base64,
              mediaType: file.type as UploadedImage["mediaType"],
              name: file.name,
            })
          }
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
        return
      }

      const scale = Math.min(MAX_DIM / width, MAX_DIM / height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)

      const originalType = file.type as UploadedImage["mediaType"]
      canvas.toBlob(
        (blob) => {
          if (!blob) return compressToJpeg(img, width, height, resolve, file.name)
          if (blob.size > MAX_SIZE_BYTES) {
            compressToJpeg(img, width, height, resolve, file.name)
          } else {
            const reader = new FileReader()
            reader.onload = () => {
              const base64 = (reader.result as string).split(",")[1]
              resolve({ data: base64, mediaType: originalType, name: file.name })
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
          }
        },
        originalType,
        0.92
      )
    }

    img.onerror = reject
    img.src = url
  })
}

function compressToJpeg(
  img: HTMLImageElement,
  width: number,
  height: number,
  resolve: (v: UploadedImage) => void,
  name?: string
) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(img, 0, 0, width, height)
  const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1]
  resolve({ data: base64, mediaType: "image/jpeg", ...(name ? { name } : {}) })
}

export default function StepUpload({ onAnalyzed, onBack }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  // Mirror previews in a ref so the unmount cleanup always sees the latest URLs
  const previewsRef = useRef<string[]>([])
  previewsRef.current = previews

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    setError("")
    const valid = Array.from(incoming).filter((f) =>
      ["image/png", "image/jpeg", "image/webp"].includes(f.type)
    )
    if (files.length + valid.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} screenshots allowed.`)
      return
    }
    const newPreviews = valid.map((f) => URL.createObjectURL(f))
    setFiles((prev) => [...prev, ...valid])
    setPreviews((prev) => [...prev, ...newPreviews])
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(previews[i])
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
    setPreviews((prev) => prev.filter((_, idx) => idx !== i))
    setError("")
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    addFiles(e.dataTransfer.files)
  }

  async function handleAnalyze() {
    if (files.length === 0) return
    setLoading(true)
    setError("")

    try {
      const prepared = await Promise.all(files.map(prepareImage))

      for (const img of prepared) {
        const sizeBytes = Math.ceil((img.data.length * 3) / 4)
        if (sizeBytes > MAX_SIZE_BYTES) {
          setError("One or more images are too large even after compression. Please use smaller screenshots.")
          setLoading(false)
          return
        }
      }

      const res = await fetch("/api/extract-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: prepared }),
      })

      const data: ExtractedEmailContext & { error?: string } = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to analyze email. Please try again.")
        return
      }

      onAnalyzed(data.context, data.detectedDetails?.importantTerms ?? [])
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
              Reading your email
            </p>
            <p className="text-xs text-stone-400 mt-0.5">Extracting text from screenshots…</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Upload email screenshots
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Upload up to 3 screenshots of the email you want to reply to.
          </p>
        </div>

        {/* Drop zone */}
        <div
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-stone-300 rounded-xl p-10 text-center cursor-pointer hover:border-teal-500 hover:bg-teal-50/40 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-lg bg-stone-100 group-hover:bg-teal-100 flex items-center justify-center mx-auto mb-3 transition-colors">
            <svg className="w-5 h-5 text-stone-400 group-hover:text-teal-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-sm text-stone-600">
            Drag &amp; drop screenshots here, or{" "}
            <span className="text-teal-700 font-semibold">browse files</span>
          </p>
          <p className="text-xs text-stone-400 mt-1">PNG, JPEG, or WebP — up to 3 files</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = "" }}
          />
        </div>

        {/* Previews */}
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Screenshot ${i + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border border-stone-200 shadow-sm"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-stone-800 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
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

        <p className="text-xs text-stone-400">Screenshots are not stored by this app.</p>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2.5 rounded-lg border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleAnalyze}
            disabled={files.length === 0 || loading}
            className="px-5 py-2.5 bg-teal-800 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Analyze email →
          </button>
        </div>
      </div>
    </div>
  )
}
