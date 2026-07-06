// Bolo mark: two overlapping speech bubbles. The teal one behind is what you
// say in your language; the amber one in front is the polished English that
// comes out. The same paths are rasterized into the app icons by
// scripts/generate-icons.mjs — keep them in sync.

export function BoloMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* back bubble: native language */}
      <path
        d="M3 10a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v3a6 6 0 0 1-6 6h-6l-5 4v-4.6A6 6 0 0 1 3 13v-3Z"
        fill="#0e5a51"
      />
      {/* front bubble: the English email */}
      <path
        d="M12 17a6 6 0 0 1 6-6h5a6 6 0 0 1 6 6v2a6 6 0 0 1-6 6h-1l4 4.4-7.4-4.4H18a6 6 0 0 1-6-6v-2Z"
        fill="#fbbf24"
      />
    </svg>
  )
}

export default function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <BoloMark />
      <span
        className="text-lg font-bold text-stone-900"
       
      >
        Bolo
      </span>
    </div>
  )
}
