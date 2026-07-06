/**
 * Regenerates app icons from the Bolo mark (two overlapping speech bubbles —
 * teal = what you say in your language, amber = the English email that comes
 * out). Keep the paths in sync with components/Logo.tsx.
 *
 * Run from the repo root: node scripts/generate-icons.mjs
 *
 * The OG image (app/opengraph-image.png) is NOT generated here — it contains
 * DM Sans text, so it was rasterized in a browser canvas with the font loaded.
 */
import sharp from "sharp"
import { writeFileSync } from "node:fs"

const APP = new URL("../app/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")

const mark = (pad) => Buffer.from(`<svg width="${32 + pad * 2}" height="${32 + pad * 2}" viewBox="${-pad} ${-pad} ${32 + pad * 2} ${32 + pad * 2}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 10a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v3a6 6 0 0 1-6 6h-6l-5 4v-4.6A6 6 0 0 1 3 13v-3Z" fill="#0e5a51"/>
  <path d="M12 17a6 6 0 0 1 6-6h5a6 6 0 0 1 6 6v2a6 6 0 0 1-6 6h-1l4 4.4-7.4-4.4H18a6 6 0 0 1-6-6v-2Z" fill="#fbbf24"/>
</svg>`)

// icon.png: 512, transparent background
const icon = await sharp(mark(1), { density: 512 }).resize(512, 512).png().toBuffer()
writeFileSync(`${APP}/icon.png`, icon)

// apple-icon.png: 180, paper background (iOS renders transparency as black)
const apple = await sharp(mark(3), { density: 512 })
  .resize(180, 180)
  .flatten({ background: "#faf8f4" })
  .png()
  .toBuffer()
writeFileSync(`${APP}/apple-icon.png`, apple)

// favicon.ico: a single 32px PNG wrapped in an ICO container
const png32 = await sharp(mark(0), { density: 512 }).resize(32, 32).png().toBuffer()
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(1, 4) // image count
const entry = Buffer.alloc(16)
entry.writeUInt8(32, 0) // width
entry.writeUInt8(32, 1) // height
entry.writeUInt16LE(1, 4) // color planes
entry.writeUInt16LE(32, 6) // bits per pixel
entry.writeUInt32LE(png32.length, 8) // image size
entry.writeUInt32LE(22, 12) // image offset (6 + 16)
writeFileSync(`${APP}/favicon.ico`, Buffer.concat([header, entry, png32]))

console.log(`icon.png ${icon.length}B | apple-icon.png ${apple.length}B | favicon.ico ${png32.length + 22}B`)
