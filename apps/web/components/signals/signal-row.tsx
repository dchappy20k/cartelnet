"use client"

import { useState } from "react"
import { ChevronDown, FileText, ShieldAlert } from "lucide-react"
import type { Signal } from "@/lib/data"
import { RiskBadge } from "@/components/glass/risk-badge"
import { GlassButton } from "@/components/glass/glass-button"
import { cn } from "@/lib/utils"

export function SignalRow({ signal, defaultOpen = false }: { signal: Signal; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="glass rounded-lg transition-colors hover:bg-white/[0.06]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
          <ShieldAlert className="h-4 w-4 text-risk-high" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">{signal.code}</span>
            <RiskBadge level={signal.level} />
          </div>
          <p className="mt-1 truncate text-sm text-foreground">{signal.description}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="animate-fade-in border-t border-white/8 p-4">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-risk-medium" />
            Risk signal detected · Requires human review
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Signal</dt>
              <dd className="mt-1 text-foreground">{signal.title}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Source</dt>
              <dd className="mt-1 text-foreground">{signal.source}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Supporting records</dt>
              <dd className="mt-1 font-mono text-foreground">{signal.records}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Detected</dt>
              <dd className="mt-1 font-mono text-foreground">{signal.detected}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Confidence</span>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-accent" style={{ width: `${signal.confidence}%`, boxShadow: "0 0 8px var(--accent)" }} />
              </div>
              <span className="font-mono text-foreground">{signal.confidence}%</span>
            </div>
            <GlassButton variant="default" size="sm">
              <FileText className="h-3.5 w-3.5" />
              View Evidence
            </GlassButton>
          </div>
        </div>
      )}
    </div>
  )
}
