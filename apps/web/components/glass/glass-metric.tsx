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
    <GlassCard hover className="relative overflow-hidden p-4">
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-40",
          accent === "accent" && "bg-accent/30",
          accent === "violet" && "bg-violet/30",
          accent === "risk-high" && "bg-risk-high/30",
          accent === "risk-critical" && "bg-risk-critical/30",
        )}
        aria-hidden
      />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground/80">{icon}</span>}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-mono text-3xl font-semibold leading-none tracking-tight text-foreground">{value}</span>
        {delta && (
          <span
            className={cn(
              "mb-0.5 text-xs font-medium",
              deltaTone === "up" && "text-risk-low",
              deltaTone === "down" && "text-risk-critical",
              deltaTone === "neutral" && "text-muted-foreground",
            )}
          >
            {delta}
          </span>
        )}
      </div>
    </GlassCard>
  )
}
