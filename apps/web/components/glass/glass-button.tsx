"use client"

import type React from "react"
import { cn } from "@/lib/utils"

type Variant = "default" | "accent" | "ghost" | "danger"
type Size = "sm" | "md" | "icon"

export function GlassButton({
  variant = "default",
  size = "md",
  className,
  children,
  ...props
}: {
  variant?: Variant
  size?: Size
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium cursor-pointer",
        "transition-all duration-300 active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none",
        "focus-visible:outline-2 focus-visible:outline-[rgba(34,211,238,0.7)]",
        size === "sm" && "h-8 px-3.5 text-xs rounded-md",
        size === "md" && "h-9.5 px-4.5 text-sm",
        size === "icon" && "h-9 w-9",
        variant === "default" &&
          "bg-white/[0.04] text-foreground border border-white/[0.1] hover:bg-white/[0.08] hover:border-white/[0.2] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md",
        variant === "accent" &&
          "bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 text-slate-950 font-semibold border-none hover:opacity-95 shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:shadow-[0_0_36px_rgba(34,211,238,0.5)]",
        variant === "ghost" &&
          "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
        variant === "danger" &&
          "border border-risk-critical/40 text-risk-critical bg-risk-critical/10 hover:bg-risk-critical/20 shadow-[0_0_16px_rgba(244,63,94,0.15)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
