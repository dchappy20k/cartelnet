import type React from "react"
import { cn } from "@/lib/utils"
import { GlassCard } from "./glass-card"

export function GlassMetric({
  label,
  value,
  delta,
  deltaTone = "neutral",
  icon,
  accent = "accent",
}: {
  label: string
  value: string
  delta?: string
  deltaTone?: "up" | "down" | "neutral"
  icon?: React.ReactNode
  accent?: "accent" | "violet" | "risk-high" | "risk-critical"
}) {
  return (
    <GlassCard hover className="group relative overflow-hidden p-5 border border-white/[0.08] hover:border-white/[0.18]">
      {/* Framer Ambient Corner Glow */}
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl opacity-35 transition-opacity duration-500 group-hover:opacity-70",
          accent === "accent" && "bg-cyan-500/40",
          accent === "violet" && "bg-indigo-500/40",
          accent === "risk-high" && "bg-amber-500/40",
          accent === "risk-critical" && "bg-rose-500/40",
        )}
        aria-hidden
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{label}</span>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-muted-foreground transition-colors group-hover:border-white/[0.16] group-hover:text-foreground">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <span className="font-mono text-3xl md:text-4xl font-bold tracking-tight text-gradient-silver leading-none">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
              deltaTone === "up" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.15)]",
              deltaTone === "down" && "border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
              deltaTone === "neutral" && "border-white/[0.08] bg-white/[0.04] text-muted-foreground",
            )}
          >
            {delta}
          </span>
        )}
      </div>
    </GlassCard>
  )
}
