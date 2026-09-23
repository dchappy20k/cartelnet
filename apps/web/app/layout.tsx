import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "CartelNet — Procurement Risk Intelligence",
  description:
    "Monitor procurement risk, investigate suspicious patterns, and review evidence across tenders, entities, and networks.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#06070a",
  colorScheme: "dark",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">
        <div className="ambient-field" aria-hidden />
        <div className="ambient-grid" aria-hidden />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  )
}
