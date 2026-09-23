import { FileSearch, AlertTriangle, Fingerprint, Radar } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassMetric } from "@/components/glass/glass-metric"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { RiskChartPanel } from "@/components/dashboard/risk-chart-panel"
import { TendersTable } from "@/components/dashboard/tenders-table"
import { tenders, kpis } from "@/lib/data"

const icons = [FileSearch, AlertTriangle, Fingerprint, Radar]

export default function OverviewPage() {
  const attention = tenders.filter((t) => t.risk === "high" || t.risk === "critical").slice(0, 6)

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Procurement Overview"
        subtitle="Monitor procurement risk, investigate suspicious patterns, and review evidence."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = icons[i]
          return <GlassMetric key={k.label} {...k} icon={<Icon className="h-4 w-4" />} />
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RiskChartPanel />
        </div>
        <GlassCard level="panel" className="p-5">
          <h2 className="text-base font-semibold text-foreground">Signal Breakdown</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Active signals by category</p>
          <div className="mt-4 space-y-3">
            {[
              { label: "Price clustering", value: 14, tone: "bg-risk-high", pct: 70 },
              { label: "Shared directorship", value: 9, tone: "bg-risk-critical", pct: 45 },
              { label: "Bid rotation", value: 12, tone: "bg-violet", pct: 60 },
              { label: "Shared address", value: 8, tone: "bg-accent", pct: 40 },
              { label: "Cover bidding", value: 9, tone: "bg-risk-medium", pct: 45 },
            ].map((s) => (
              <div key={s.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-mono text-foreground">{s.value}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${s.tone}`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard level="panel" className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/8 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <span className="h-2 w-2 rounded-full bg-risk-high" style={{ boxShadow: "0 0 8px var(--risk-high)" }} />
              Attention Required
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">High and critical risk tenders flagged for review</p>
          </div>
          <GlassButton variant="default" size="sm">
            View all
          </GlassButton>
        </div>
        <TendersTable rows={attention} />
      </GlassCard>
    </div>
  )
}
