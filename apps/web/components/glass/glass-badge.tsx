import type React from "react"
import { cn } from "@/lib/utils"

export type Tone =
  | "default"
  | "accent"
  | "violet"
  | "muted"
  | "critical"
  | "warning"
  | "low"
  | "medium"
  | "high"
  | "cyan"

export function GlassBadge({
  tone = "default",
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        tone === "default" && "border-white/12 bg-white/5 text-foreground",
        tone === "accent" && "border-accent/35 bg-accent/10 text-accent",
        tone === "violet" && "border-violet/35 bg-violet/10 text-violet",
        tone === "muted" && "border-white/10 bg-white/[0.03] text-muted-foreground",
        (tone === "critical" || tone === "high") && "border-red-500/35 bg-red-500/10 text-red-400",
        (tone === "warning" || tone === "medium") && "border-amber-500/35 bg-amber-500/10 text-amber-400",
        tone === "low" && "border-emerald-500/35 bg-emerald-500/10 text-emerald-400",
        tone === "cyan" && "border-cyan-500/35 bg-cyan-500/10 text-cyan-400",
        className,
      )}
    >
      {children}
    </span>
  )
}
