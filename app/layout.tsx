import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"
  ),
  title: "Bolo — Email Assistant",
  description:
    "Speak or type in your language. Bolo writes the professional English email for you.",
  applicationName: "Bolo",
  openGraph: {
    title: "Bolo — Email Assistant",
    description:
      "Speak or type in your language. Bolo writes the professional English email for you.",
    siteName: "Bolo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bolo — Email Assistant",
    description:
      "Speak or type in your language. Bolo writes the professional English email for you.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
