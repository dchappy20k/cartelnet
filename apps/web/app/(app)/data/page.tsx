"use client"

import { useState } from "react"
import { Database, Upload, Columns3, ShieldCheck, Sparkles, Check, FileSpreadsheet, ArrowRight, ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { cn } from "@/lib/utils"

const steps = [
  { label: "Select Data Source", icon: Database },
  { label: "Upload File", icon: Upload },
  { label: "Map Columns", icon: Columns3 },
  { label: "Validate", icon: ShieldCheck },
  { label: "Analyze", icon: Sparkles },
]

const sources = [
  { name: "CSV / Excel Upload", desc: "Import tender records from a spreadsheet file" },
  { name: "Procurement API", desc: "Connect to a public procurement data feed" },
  { name: "Database Connection", desc: "Sync directly from a SQL data warehouse" },
]

const columns = [
  ["tender_ref", "Tender ID"],
  ["authority_name", "Authority"],
  ["contract_value", "Value"],
  ["num_bidders", "Bidders"],
  ["award_date", "Awarded"],
]

export default function DataPage() {
  const [step, setStep] = useState(0)

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Data Import"
        subtitle="Ingest procurement data through a validated multi-step pipeline before analysis."
      />

      {/* Progress */}
      <GlassCard level="panel" className="p-5">
        <div className="flex items-center">
          {steps.map((s, i) => {
            const done = i < step
            const current = i === step
            return (
              <div key={s.label} className="flex flex-1 items-center last:flex-none">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all",
                      done && "border-accent/40 bg-accent/15 text-accent",
                      current && "border-accent/60 bg-accent/10 text-accent accent-glow",
                      !done && !current && "border-white/10 bg-white/[0.03] text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Step {i + 1}</div>
                    <div className={cn("text-sm font-medium", current || done ? "text-foreground" : "text-muted-foreground")}>{s.label}</div>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="mx-3 h-px flex-1 bg-gradient-to-r" style={{ backgroundImage: done ? "linear-gradient(90deg,var(--accent),rgba(34,211,238,0.2))" : "linear-gradient(90deg,rgba(255,255,255,0.1),rgba(255,255,255,0.1))" }} />
                )}
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* Step content */}
      <GlassCard level="panel" className="p-6">
        {step === 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">Select a data source</h3>
            {sources.map((s, i) => (
              <label key={s.name} className="glass-control flex cursor-pointer items-center gap-4 rounded-lg p-4">
                <input type="radio" name="source" defaultChecked={i === 0} className="h-4 w-4 accent-[var(--accent)]" />
                <FileSpreadsheet className="h-5 w-5 text-accent" />
                <div>
                  <div className="text-sm font-medium text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="mb-3 text-base font-semibold text-foreground">Upload your file</h3>
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <Upload className="h-5 w-5 text-accent" />
              </div>
              <div className="text-sm text-foreground">Drag & drop a CSV or Excel file</div>
              <div className="text-xs text-muted-foreground">or</div>
              <GlassButton variant="default" size="sm">Browse files</GlassButton>
              <div className="mt-2 text-xs text-muted-foreground">tenders_q3_2026.csv · 2.4 MB</div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="mb-3 text-base font-semibold text-foreground">Map columns</h3>
            <div className="space-y-2">
              {columns.map(([src, dest]) => (
                <div key={src} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] p-3">
                  <span className="flex-1 font-mono text-sm text-muted-foreground">{src}</span>
                  <ArrowRight className="h-4 w-4 text-accent" />
                  <span className="flex-1 text-sm font-medium text-foreground">{dest}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="mb-4 text-base font-semibold text-foreground">Validation results</h3>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Rows detected", value: "1,248", tone: "text-foreground" },
                { label: "Valid", value: "1,221", tone: "text-risk-low" },
                { label: "Warnings", value: "17", tone: "text-risk-medium" },
                { label: "Errors", value: "10", tone: "text-risk-critical" },
              ].map((v) => (
                <div key={v.label} className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
                  <div className={cn("font-mono text-2xl font-semibold", v.tone)}>{v.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{v.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-risk-medium/25 bg-risk-medium/5 p-3 text-sm text-muted-foreground">
              27 rows require review. Warnings and errors can be resolved before analysis or skipped.
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-accent/10 accent-glow">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Analysis complete</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              1,221 tender records ingested and scanned. 8 new risk signals detected and added to the Risk Monitor for human review.
            </p>
            <GlassButton variant="accent" size="md">View Risk Monitor</GlassButton>
          </div>
        )}
      </GlassCard>

      <div className="flex justify-between">
        <GlassButton variant="ghost" size="md" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" />Back
        </GlassButton>
        <GlassButton variant="accent" size="md" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1}>
          {step === 3 ? "Run Analysis" : "Continue"}<ArrowRight className="h-4 w-4" />
        </GlassButton>
      </div>
    </div>
  )
}
