"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import { InvestigationWorkspace } from "@/components/investigations/workspace"
import { investigations, type Investigation } from "@/lib/data"
import { cn } from "@/lib/utils"

const statusTone: Record<Investigation["status"], "accent" | "violet" | "muted" | "default"> = {
  "Under Review": "accent",
  Escalated: "violet",
  Open: "default",
  Closed: "muted",
}

const priorityColor: Record<Investigation["priority"], string> = {
  High: "text-risk-high",
  Medium: "text-risk-medium",
  Low: "text-muted-foreground",
}

export default function InvestigationsPage() {
  const [active, setActive] = useState<Investigation | null>(null)

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Investigations"
        subtitle="Structured reviews of flagged procurement activity. Findings require human verification."
        actions={<GlassButton variant="accent" size="md"><Plus className="h-4 w-4" />New Investigation</GlassButton>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {investigations.map((inv) => (
          <GlassCard
            key={inv.id}
            hover
            className="cursor-pointer p-5"
            onClick={() => setActive(inv)}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-medium text-accent">{inv.id}</span>
              <GlassBadge tone={statusTone[inv.status]}>{inv.status}</GlassBadge>
            </div>
            <h3 className="mt-2 text-sm font-medium leading-snug text-foreground">{inv.title}</h3>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span className={cn("font-medium", priorityColor[inv.priority])}>{inv.priority} priority</span>
              <span>{inv.investigator}</span>
            </div>
            <div className="mt-3 flex gap-4 border-t border-white/8 pt-3 text-xs text-muted-foreground">
              <span><span className="font-mono text-foreground">{inv.entities}</span> entities</span>
              <span><span className="font-mono text-foreground">{inv.signals}</span> signals</span>
              <span className="ml-auto">Opened {inv.opened}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      <InvestigationWorkspace investigation={active} onClose={() => setActive(null)} />
    </div>
  )
}
