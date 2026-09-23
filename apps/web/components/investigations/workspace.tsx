"use client"

import { useEffect, useState } from "react"
import { X, UserPlus, StickyNote, Eye, ArrowUpCircle, FileOutput, CheckCircle2 } from "lucide-react"
import type { Investigation } from "@/lib/data"
import { signals } from "@/lib/data"
import { GlassTabs } from "@/components/glass/glass-tabs"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import { RiskBadge } from "@/components/glass/risk-badge"
import { SignalRow } from "@/components/signals/signal-row"

const SECTIONS = ["Summary", "Evidence", "Entities", "Timeline", "Notes"]

const actions = [
  { label: "Assign Investigator", icon: UserPlus },
  { label: "Add Note", icon: StickyNote },
  { label: "Request Review", icon: Eye },
  { label: "Escalate", icon: ArrowUpCircle },
  { label: "Generate Report", icon: FileOutput },
]

export function InvestigationWorkspace({
  investigation,
  onClose,
}: {
  investigation: Investigation | null
  onClose: () => void
}) {
  const [tab, setTab] = useState("Summary")

  useEffect(() => {
    if (!investigation) return
    setTab("Summary")
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [investigation, onClose])

  if (!investigation) return null
  const inv = investigation

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 animate-overlay-in bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 ml-auto flex h-full w-full max-w-5xl animate-drawer-in flex-col glass-chrome" role="dialog" aria-modal="true">
        {/* header */}
        <header className="flex items-start justify-between gap-4 border-b border-white/8 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-lg font-semibold text-foreground">{inv.id}</span>
              <GlassBadge tone="violet">{inv.priority} Priority</GlassBadge>
              <GlassBadge tone="accent">{inv.status}</GlassBadge>
            </div>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{inv.title}</p>
          </div>
          <button onClick={onClose} className="glass-control flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* main */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-white/8 p-4">
              <GlassTabs tabs={SECTIONS} active={tab} onChange={setTab} />
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin p-5">
              {tab === "Summary" && (
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-risk-medium" />
                    Risk signals detected · Requires human review · No determination of wrongdoing
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    This investigation aggregates {inv.signals} risk signals across {inv.entities} entities linked to
                    tender {inv.tender}. Signals include price clustering and shared directorship between competing
                    bidders. The case is currently <span className="text-foreground">{inv.status.toLowerCase()}</span> and
                    assigned to <span className="text-foreground">{inv.investigator}</span>.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Entities", inv.entities],
                      ["Signals", inv.signals],
                      ["Opened", inv.opened],
                      ["Tender", inv.tender],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="rounded-lg border border-white/8 bg-white/[0.03] p-3">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</div>
                        <div className="mt-1 truncate font-mono text-sm text-foreground">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "Evidence" && (
                <div className="space-y-3">
                  {signals.slice(0, 3).map((s, i) => (
                    <SignalRow key={s.id} signal={s} defaultOpen={i === 0} />
                  ))}
                </div>
              )}

              {tab === "Entities" && (
                <div className="space-y-2">
                  {["Meridian Civil Works Ltd.", "Apex Infrastructure Group", "Northgate Contracting", "J. Vantor (Director)"].map((e, i) => (
                    <div key={e} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] p-3">
                      <span className="text-sm text-foreground">{e}</span>
                      <RiskBadge level={i === 0 ? "high" : i === 3 ? "critical" : "medium"} />
                    </div>
                  ))}
                </div>
              )}

              {tab === "Timeline" && (
                <ol className="relative space-y-5 border-l border-white/10 pl-6">
                  {[
                    ["2026-09-22", "Investigation escalated for review"],
                    ["2026-09-20", "Evidence bundle compiled"],
                    ["2026-09-19", "Additional entity linked"],
                    [inv.opened, "Investigation opened"],
                  ].map(([t, l], i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full bg-accent" style={{ boxShadow: "0 0 8px var(--accent)" }} />
                      <div className="font-mono text-xs text-muted-foreground">{t}</div>
                      <div className="mt-0.5 text-sm text-foreground">{l}</div>
                    </li>
                  ))}
                </ol>
              )}

              {tab === "Notes" && (
                <div className="space-y-3">
                  <textarea
                    placeholder="Add an investigator note…"
                    rows={3}
                    className="glass-control w-full resize-none rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <div className="rounded-lg border border-white/8 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="text-foreground">A. Okonkwo</span>
                      <span>2026-09-21</span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Confirmed shared registered address via corporate registry. Flagging for secondary review before any escalation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* action panel */}
          <aside className="hidden w-64 shrink-0 border-l border-white/8 p-4 md:block">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</h4>
            <div className="space-y-2">
              {actions.map((a) => (
                <GlassButton key={a.label} variant="default" size="md" className="w-full justify-start">
                  <a.icon className="h-4 w-4" />
                  {a.label}
                </GlassButton>
              ))}
              <GlassButton variant="danger" size="md" className="w-full justify-start">
                <CheckCircle2 className="h-4 w-4" />
                Close Investigation
              </GlassButton>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
