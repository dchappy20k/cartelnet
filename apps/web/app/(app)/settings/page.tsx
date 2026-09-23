"use client"

import { useState } from "react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { cn } from "@/lib/utils"

function Toggle({ defaultOn = false, label, desc }: { defaultOn?: boolean; label: string; desc: string }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/8 py-4 last:border-0">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <button
        onClick={() => setOn((v) => !v)}
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={cn("relative h-6 w-11 shrink-0 rounded-full border transition-colors", on ? "border-accent/50 bg-accent/30" : "border-white/12 bg-white/5")}
      >
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", on ? "left-6" : "left-0.5")} style={on ? { boxShadow: "0 0 8px var(--accent)" } : undefined} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Settings" subtitle="Manage workspace preferences, alerting, and detection thresholds." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard level="panel" className="p-5">
          <h3 className="text-base font-semibold text-foreground">Alerting</h3>
          <div className="mt-2">
            <Toggle defaultOn label="Critical signal alerts" desc="Notify immediately when a critical signal is detected" />
            <Toggle defaultOn label="Daily digest" desc="Summary of new signals every morning" />
            <Toggle label="Weekly risk report" desc="Automated portfolio risk overview" />
          </div>
        </GlassCard>
        <GlassCard level="panel" className="p-5">
          <h3 className="text-base font-semibold text-foreground">Detection</h3>
          <div className="mt-2">
            <Toggle defaultOn label="Price clustering detection" desc="Flag bids with abnormally narrow separation" />
            <Toggle defaultOn label="Shared entity detection" desc="Detect shared directors and addresses" />
            <Toggle defaultOn label="Bid rotation detection" desc="Identify alternating winners across tenders" />
          </div>
          <div className="mt-4 flex justify-end">
            <GlassButton variant="accent" size="md">Save changes</GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
