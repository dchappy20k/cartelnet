"use client"

import { useState } from "react"
import { FileText, Fingerprint, ShieldAlert, Share2, FileDown, Sheet, Eye } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import { cn } from "@/lib/utils"

const reportTypes = [
  { id: "tender", name: "Tender Risk Report", desc: "Full risk breakdown for a single tender", icon: FileText },
  { id: "investigation", name: "Investigation Summary", desc: "Structured summary of an active case", icon: Fingerprint },
  { id: "overview", name: "Procurement Risk Overview", desc: "Portfolio-wide risk posture", icon: ShieldAlert },
  { id: "relationship", name: "Company Relationship Report", desc: "Entity network and linkage analysis", icon: Share2 },
]

export default function ReportsPage() {
  const [selected, setSelected] = useState("tender")
  const report = reportTypes.find((r) => r.id === selected)!

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Generate and export structured intelligence reports for review and disclosure."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Report Type</h2>
          {reportTypes.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-all",
                selected === r.id
                  ? "border-accent/40 bg-accent/[0.07] accent-glow"
                  : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]",
              )}
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md border", selected === r.id ? "border-accent/40 text-accent" : "border-white/10 text-muted-foreground")}>
                <r.icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">{r.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{r.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <GlassCard level="panel" className="flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/8 p-5">
            <div className="flex items-center gap-3">
              <report.icon className="h-5 w-5 text-accent" />
              <div>
                <div className="text-base font-semibold text-foreground">{report.name}</div>
                <div className="text-xs text-muted-foreground">Preview · generated {`2026-09-24`}</div>
              </div>
            </div>
            <GlassBadge tone="muted">Draft</GlassBadge>
          </div>

          {/* Preview surface */}
          <div className="flex-1 p-5">
            <div className="rounded-lg border border-white/8 bg-gradient-to-b from-white/[0.04] to-transparent p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-foreground">{report.name}</div>
                  <div className="text-xs text-muted-foreground">CartelNet · Confidential · For human review</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>Ref: RPT-2026-0912</div>
                  <div>Directorate of Public Contracts</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-2 w-3/4 rounded bg-white/10" />
                <div className="h-2 w-full rounded bg-white/[0.06]" />
                <div className="h-2 w-5/6 rounded bg-white/[0.06]" />
                <div className="my-4 grid grid-cols-3 gap-3">
                  {["Signals", "Entities", "Risk"].map((l) => (
                    <div key={l} className="rounded-md border border-white/8 bg-white/[0.03] p-3">
                      <div className="text-[11px] uppercase text-muted-foreground">{l}</div>
                      <div className="mt-1 h-4 w-10 rounded bg-white/10" />
                    </div>
                  ))}
                </div>
                <div className="h-2 w-full rounded bg-white/[0.06]" />
                <div className="h-2 w-2/3 rounded bg-white/[0.06]" />
              </div>
              <div className="mt-5 rounded-md border border-white/10 bg-white/[0.02] p-3 text-xs text-muted-foreground">
                This report presents risk signals detected through automated monitoring. Findings require human review and do not constitute a determination of wrongdoing.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/8 p-4">
            <GlassButton variant="default" size="md"><Eye className="h-4 w-4" />Preview</GlassButton>
            <GlassButton variant="accent" size="md"><FileText className="h-4 w-4" />Generate Report</GlassButton>
            <GlassButton variant="default" size="md"><FileDown className="h-4 w-4" />Export PDF</GlassButton>
            <GlassButton variant="default" size="md"><Sheet className="h-4 w-4" />Export CSV</GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
