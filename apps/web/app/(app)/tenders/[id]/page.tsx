"use client"

import { use, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Building2, Calendar, Users, Coins, FileDown } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import { GlassTabs } from "@/components/glass/glass-tabs"
import { RiskBadge } from "@/components/glass/risk-badge"
import { RiskMeter } from "@/components/glass/risk-meter"
import { SignalRow } from "@/components/signals/signal-row"
import { tenders, signals, formatCurrency } from "@/lib/data"
import { downloadReportPdf } from "@/lib/api-client"

const TABS = ["Overview", "Bidders", "Risk Signals", "Network", "Timeline", "Evidence", "Investigation"]

const bidders = [
  { name: "Meridian Civil Works Ltd.", bid: 46.2, status: "Awarded", risk: "high" as const },
  { name: "Apex Infrastructure Group", bid: 46.9, status: "Runner-up", risk: "high" as const },
  { name: "Northgate Contracting", bid: 47.4, status: "Rejected", risk: "medium" as const },
]

const timeline = [
  { time: "2026-09-22 14:02", label: "Critical signal raised — shared directorship", tone: "critical" },
  { time: "2026-09-20 09:15", label: "Award decision recorded", tone: "default" },
  { time: "2026-09-14 16:40", label: "Bids opened — 3 submissions", tone: "default" },
  { time: "2026-08-30 10:00", label: "Tender published", tone: "default" },
]

export default function Tender360({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const tender = tenders.find((t) => t.id === id)
  const [tab, setTab] = useState("Overview")

  if (!tender) notFound()

  return (
    <div className="animate-fade-in space-y-6">
      <Link href="/tenders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Tenders
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PageHeader
            title={tender.name}
            subtitle={`${tender.id} · ${tender.authority}`}
            actions={
              <div className="flex items-center gap-2">
                <RiskBadge level={tender.risk} />
                <GlassButton
                  size="sm"
                  variant="accent"
                  onClick={() => downloadReportPdf(tender.id, `CartelNet_Risk_Audit_${tender.id}.pdf`)}
                  className="gap-1.5"
                >
                  <FileDown className="h-4 w-4" />
                  Download PDF Report
                </GlassButton>
              </div>
            }
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { icon: Coins, label: "Value", value: formatCurrency(tender.value) },
              { icon: Users, label: "Bidders", value: String(tender.bidders) },
              { icon: Building2, label: "Category", value: tender.category },
              { icon: Calendar, label: "Status", value: tender.status },
            ].map((s) => (
              <GlassCard key={s.label} className="p-3.5">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <div className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
                <div className="mt-0.5 truncate text-sm font-medium text-foreground">{s.value}</div>
              </GlassCard>
            ))}
          </div>
        </div>

        <GlassCard level="panel" className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Risk Score</span>
            <RiskBadge level={tender.risk} />
          </div>
          <div className="mt-3">
            <RiskMeter score={tender.score} level={tender.risk} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Composite score derived from {tender.signals} detected signals. Indicates elevated risk requiring human review — not a determination of wrongdoing.
          </p>
        </GlassCard>
      </div>

      <GlassTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "Overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <GlassCard level="panel" className="p-5 lg:col-span-2">
            <h3 className="text-base font-semibold text-foreground">Summary</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This tender was flagged during automated monitoring due to a combination of price clustering and a shared
              directorship between two competing bidders. The winning bid margin was unusually narrow. These are risk
              signals detected by the system and require human review before any conclusion is drawn.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <GlassBadge tone="accent">Price clustering</GlassBadge>
              <GlassBadge tone="violet">Shared directorship</GlassBadge>
              <GlassBadge tone="muted">Narrow margin</GlassBadge>
            </div>
          </GlassCard>
          <GlassCard level="panel" className="p-5">
            <h3 className="text-base font-semibold text-foreground">Key Facts</h3>
            <dl className="mt-3 space-y-3 text-sm">
              {[
                ["Authority", tender.authority],
                ["Published", "2026-08-30"],
                ["Bids opened", "2026-09-14"],
                ["Signals", `${tender.signals} detected`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </GlassCard>
        </div>
      )}

      {tab === "Bidders" && (
        <GlassCard level="panel" className="overflow-hidden">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Bidder</th>
                  <th className="px-5 py-3 font-medium text-right">Bid (M)</th>
                  <th className="px-5 py-3 font-medium">Outcome</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {bidders.map((b) => (
                  <tr key={b.name} className="border-t border-white/6 hover:bg-white/[0.035]">
                    <td className="px-5 py-3.5 font-medium text-foreground">{b.name}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-foreground">${b.bid.toFixed(1)}M</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{b.status}</td>
                    <td className="px-5 py-3.5"><RiskBadge level={b.risk} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {tab === "Risk Signals" && (
        <div className="space-y-3">
          {signals.slice(0, tender.signals || 3).map((s, i) => (
            <SignalRow key={s.id} signal={s} defaultOpen={i === 0} />
          ))}
        </div>
      )}

      {tab === "Network" && (
        <GlassCard level="panel" className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <p className="text-sm text-muted-foreground">View this tender within the full relationship graph.</p>
          <Link href="/network"><GlassButton variant="accent" size="md">Open Network Graph</GlassButton></Link>
        </GlassCard>
      )}

      {tab === "Timeline" && (
        <GlassCard level="panel" className="p-5">
          <ol className="relative space-y-5 border-l border-white/10 pl-6">
            {timeline.map((e, i) => (
              <li key={i} className="relative">
                <span
                  className={`absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full ${e.tone === "critical" ? "bg-risk-critical" : "bg-accent"}`}
                  style={{ boxShadow: `0 0 8px ${e.tone === "critical" ? "var(--risk-critical)" : "var(--accent)"}` }}
                />
                <div className="font-mono text-xs text-muted-foreground">{e.time}</div>
                <div className="mt-0.5 text-sm text-foreground">{e.label}</div>
              </li>
            ))}
          </ol>
        </GlassCard>
      )}

      {tab === "Evidence" && (
        <div className="space-y-3">
          {signals.slice(0, 2).map((s) => (
            <GlassCard key={s.id} level="panel" className="p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">{s.code}</span>
                <RiskBadge level={s.level} />
              </div>
              <p className="mt-2 text-sm text-foreground">{s.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div><dt className="text-xs uppercase text-muted-foreground">Source</dt><dd className="mt-1 text-foreground">{s.source}</dd></div>
                <div><dt className="text-xs uppercase text-muted-foreground">Records</dt><dd className="mt-1 font-mono text-foreground">{s.records}</dd></div>
                <div><dt className="text-xs uppercase text-muted-foreground">Detected</dt><dd className="mt-1 font-mono text-foreground">{s.detected}</dd></div>
                <div><dt className="text-xs uppercase text-muted-foreground">Confidence</dt><dd className="mt-1 font-mono text-foreground">{s.confidence}%</dd></div>
              </dl>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === "Investigation" && (
        <GlassCard level="panel" className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <p className="text-sm text-muted-foreground">No active investigation is linked. Create one to begin a structured review.</p>
          <Link href="/investigations"><GlassButton variant="accent" size="md">Open Investigations</GlassButton></Link>
        </GlassCard>
      )}
    </div>
  )
}
