import { Radar, TrendingUp, ShieldAlert } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassMetric } from "@/components/glass/glass-metric"
import { GlassBadge } from "@/components/glass/glass-badge"
import { RiskChartPanel } from "@/components/dashboard/risk-chart-panel"
import { SignalRow } from "@/components/signals/signal-row"
import { signals } from "@/lib/data"

export default function RiskMonitorPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Risk Monitor"
        subtitle="Live feed of detected risk signals across all monitored procurement activity."
        actions={<GlassBadge tone="accent"><span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />Live</GlassBadge>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <GlassMetric label="Signals (24h)" value="18" delta="+6" deltaTone="down" accent="risk-critical" icon={<Radar className="h-4 w-4" />} />
        <GlassMetric label="Critical" value="4" delta="+2" deltaTone="down" accent="risk-critical" icon={<ShieldAlert className="h-4 w-4" />} />
        <GlassMetric label="Avg. Confidence" value="73%" delta="+3%" deltaTone="up" accent="accent" icon={<TrendingUp className="h-4 w-4" />} />
        <GlassMetric label="Entities Watched" value="312" delta="+11" deltaTone="neutral" accent="violet" icon={<Radar className="h-4 w-4" />} />
      </div>

      <RiskChartPanel />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Signal Feed</h2>
          <span className="text-sm text-muted-foreground">{signals.length} active signals · requires human review</span>
        </div>
        <div className="space-y-3">
          {signals.map((s, i) => (
            <SignalRow key={s.id} signal={s} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </div>
  )
}
