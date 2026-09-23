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
        "inline-flex items-center justify-center gap-2 rounded-md font-medium",
        "transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none",
        "focus-visible:outline-2 focus-visible:outline-[rgba(34,211,238,0.7)]",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-9 px-4 text-sm",
        size === "icon" && "h-9 w-9",
        variant === "default" &&
          "glass-control text-foreground",
        variant === "accent" &&
          "bg-accent/90 text-accent-foreground border border-accent/40 hover:bg-accent shadow-[0_0_20px_rgba(34,211,238,0.25)]",
        variant === "ghost" &&
          "text-muted-foreground hover:text-foreground hover:bg-white/5",
        variant === "danger" &&
          "border border-risk-critical/40 text-risk-critical bg-risk-critical/10 hover:bg-risk-critical/20",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
