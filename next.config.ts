import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Tesseract.js (screenshot OCR, runs in the browser) fetches its worker
// script, WebAssembly core and English language data from jsDelivr, then
// starts the worker from a blob: URL. Those are the only third-party origins
// the app talks to from the browser; everything else is same-origin.
const OCR_CDN = "https://cdn.jsdelivr.net";

// No nonces on purpose: they force every page to render dynamically, and this
// app has no user-generated HTML to protect. 'unsafe-inline' is what Next.js
// needs for its own inline bootstrap scripts without them.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: ${OCR_CDN}${isDev ? " 'unsafe-eval'" : ""}`,
  "worker-src 'self' blob:",
  `connect-src 'self' data: blob: ${OCR_CDN}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Older browsers that predate frame-ancestors
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The microphone is needed for voice input; nothing else is
  {
    key: "Permissions-Policy",
    value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
