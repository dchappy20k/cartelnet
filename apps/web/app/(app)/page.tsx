import Link from "next/link"
import { FileSearch, AlertTriangle, Fingerprint, Radar, Sparkles, ArrowRight, Activity, ShieldAlert } from "lucide-react"
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
    <div className="animate-fade-in space-y-8">
      {/* Framer AI Startup Kit Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent p-6 md:p-8 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute right-1/3 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" aria-hidden />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.2)]">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>AI-POWERED PROCUREMENT INTELLIGENCE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gradient-silver">
              Detect Collusion Before Public Funds Move
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed">
              CartelNet continuously monitors procurement tenders, cross-analyzing price variance, shared directorships, and spatial clustering using deterministic mathematical models and graph topology.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
            <Link href="/network">
              <GlassButton variant="accent" size="md" className="gap-2 shadow-[0_0_24px_rgba(34,211,238,0.4)]">
                <Radar className="h-4 w-4" />
                <span>Explore Network Graph</span>
                <ArrowRight className="h-4 w-4" />
              </GlassButton>
            </Link>
            <Link href="/data">
              <GlassButton variant="default" size="md" className="gap-2">
                <Activity className="h-4 w-4" />
                <span>Upload Data Dossier</span>
              </GlassButton>
            </Link>
          </div>
        </div>
      </div>

      <PageHeader
        title="Procurement Overview"
        subtitle="Live telemetry across registered authorities, screened bidding clusters, and active investigations."
        badge="REAL-TIME MONITORING"
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
        <GlassCard level="panel" className="p-6 border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Topological Signals</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Active anomaly triggers detected across tenders</p>
            </div>
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/25 px-2.5 py-1 text-[11px] font-mono font-semibold text-cyan-400">
              52 Total
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {[
              { label: "Price clustering (CV < 1.5%)", value: 14, tone: "bg-amber-400", pct: 70 },
              { label: "Shared directorship bridge", value: 9, tone: "bg-rose-500", pct: 45 },
              { label: "Co-bidding rotation scheme", value: 12, tone: "bg-indigo-400", pct: 60 },
              { label: "Shared registered address", value: 8, tone: "bg-cyan-400", pct: 40 },
              { label: "Cover bidding pattern", value: 9, tone: "bg-amber-500", pct: 45 },
            ].map((s) => (
              <div key={s.label} className="group">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">{s.label}</span>
                  <span className="font-mono font-semibold text-foreground">{s.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05] p-0.5 border border-white/[0.04]">
                  <div className={`h-full rounded-full transition-all duration-500 ${s.tone}`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard level="panel" className="overflow-hidden border border-white/[0.08]">
        <div className="flex items-center justify-between border-b border-white/[0.08] p-5 sm:p-6 bg-white/[0.01]">
          <div>
            <h2 className="flex items-center gap-2.5 text-base font-bold text-foreground">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              Priority Action Required
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Tenders exhibiting critical risk scores requiring immediate investigator hold</p>
          </div>
          <Link href="/tenders">
            <GlassButton variant="default" size="sm" className="gap-1.5 text-xs">
              <span>View All Tenders</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </GlassButton>
          </Link>
        </div>
        <TendersTable rows={attention} />
      </GlassCard>
    </div>
  )
}
