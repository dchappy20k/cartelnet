"use client"

import { useState } from "react"
import { Search, SlidersHorizontal, Download } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { TendersTable } from "@/components/dashboard/tenders-table"
import { tenders } from "@/lib/data"
import type { RiskLevel } from "@/components/glass/risk-badge"
import { cn } from "@/lib/utils"

const filters: (RiskLevel | "all")[] = ["all", "critical", "high", "medium", "low"]

export default function TendersPage() {
  const [query, setQuery] = useState("")
  const [risk, setRisk] = useState<RiskLevel | "all">("all")

  const rows = tenders.filter((t) => {
    const matchesQuery =
      !query ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.authority.toLowerCase().includes(query.toLowerCase()) ||
      t.id.toLowerCase().includes(query.toLowerCase())
    const matchesRisk = risk === "all" || t.risk === risk
    return matchesQuery && matchesRisk
  })

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Tenders"
        subtitle="Browse and filter procurement tenders across all monitored authorities."
        actions={
          <GlassButton variant="default" size="md">
            <Download className="h-4 w-4" />
            Export
          </GlassButton>
        }
      />

      <GlassCard level="panel" className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/8 p-4 md:flex-row md:items-center">
          <div className="glass-control flex h-9 flex-1 items-center gap-2.5 rounded-md px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by tender, authority, or ID…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-white/8 bg-white/[0.03] p-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setRisk(f)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  risk === f ? "bg-white/8 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <GlassButton variant="default" size="icon" aria-label="More filters">
            <SlidersHorizontal className="h-4 w-4" />
          </GlassButton>
        </div>
        {rows.length > 0 ? (
          <TendersTable rows={rows} />
        ) : (
          <div className="p-12 text-center text-sm text-muted-foreground">No tenders match your filters.</div>
        )}
      </GlassCard>
    </div>
  )
}
