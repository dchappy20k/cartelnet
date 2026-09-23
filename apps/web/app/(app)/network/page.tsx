"use client"

import { useState, useEffect } from "react"
import { Maximize2, Filter, RefreshCw, Layers } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import { NetworkGraph } from "@/components/network/graph"
import { CompanyDrawer } from "@/components/network/company-drawer"
import { getGlobalGraph, getTenderGraph, type ApiGraphResponse } from "@/lib/api-client"

const TENDER_FILTERS = [
  { id: "all", label: "All Entities (Global)" },
  { id: "TND-8842", label: "TND-8842: Highway Resurfacing" },
  { id: "TND-8755", label: "TND-8755: Rail Signalling" },
  { id: "TND-8817", label: "TND-8817: Water Treatment" },
]

export default function NetworkPage() {
  const [selectedTender, setSelectedTender] = useState<string>("TND-8842")
  const [graphData, setGraphData] = useState<ApiGraphResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const loadGraph = (tenderId: string) => {
    setLoading(true)
    const fetcher = tenderId === "all" ? getGlobalGraph() : getTenderGraph(tenderId)
    fetcher
      .then((data) => setGraphData(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadGraph(selectedTender)
  }, [selectedTender])

  const totalEntities = graphData?.summary?.total_nodes ?? 10
  const totalLinks = graphData?.summary?.total_edges ?? 11

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Entity Network"
        subtitle="Explore relationships between tenders, bidders, directors, and registered addresses. Click any company node to inspect its intelligence dossier."
        actions={
          <div className="flex items-center gap-2">
            <GlassButton
              variant="default"
              size="md"
              onClick={() => loadGraph(selectedTender)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </GlassButton>
            <GlassButton variant="default" size="icon" aria-label="Fullscreen">
              <Maximize2 className="h-4 w-4" />
            </GlassButton>
          </div>
        }
      />

      {/* Tender filter buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
          <Filter className="h-3.5 w-3.5" /> Scope:
        </span>
        {TENDER_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedTender(f.id)}
            className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
              selectedTender === f.id
                ? "bg-accent/20 text-accent border border-accent/40 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
                : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/8"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <GlassCard level="panel" className="relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" style={{ boxShadow: "0 0 8px var(--accent)" }} />
            <span className="text-sm font-medium text-foreground">
              {selectedTender === "all" ? "Global Procurement Entity Graph" : `${selectedTender} — Relationship Cluster`}
            </span>
          </div>
          <GlassBadge tone="violet">
            {totalEntities} entities · {totalLinks} links
          </GlassBadge>
        </div>
        <div
          className="h-[560px] w-full"
          style={{ background: "radial-gradient(70% 60% at 50% 45%, rgba(34,211,238,0.06), transparent 70%)" }}
        >
          <NetworkGraph
            nodes={graphData?.nodes}
            edges={graphData?.edges}
            onSelectCompany={setCompanyId}
          />
        </div>
      </GlassCard>

      <CompanyDrawer companyId={companyId} onClose={() => setCompanyId(null)} />
    </div>
  )
}
