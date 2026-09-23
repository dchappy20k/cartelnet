"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { riskTrend } from "@/lib/data"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassBadge } from "@/components/glass/glass-badge"

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-panel rounded-lg px-3 py-2 text-xs">
      <div className="mb-1.5 font-medium text-foreground">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}</span>
          <span className="ml-auto font-mono text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function RiskChartPanel() {
  return (
    <GlassCard level="panel" className="p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Risk Analytics</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Detected signals and flagged tenders over 6 months</p>
        </div>
        <GlassBadge tone="accent">Last 6 mo</GlassBadge>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={riskTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="g-signals" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g-high" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b7cf6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#8b7cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.35)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.35)" fontSize={11} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
            <Area
              type="monotone"
              dataKey="signals"
              name="signals"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#g-signals)"
              style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.4))" }}
            />
            <Area type="monotone" dataKey="high" name="high-risk" stroke="#8b7cf6" strokeWidth={2} fill="url(#g-high)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" style={{ boxShadow: "0 0 6px var(--accent)" }} /> Signals detected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet" /> High-risk tenders
        </span>
      </div>
    </GlassCard>
  )
}
