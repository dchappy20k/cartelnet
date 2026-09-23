"use client"

import { useState } from "react"
import { Maximize2, Filter } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import { NetworkGraph } from "@/components/network/graph"
import { CompanyDrawer } from "@/components/network/company-drawer"

export default function NetworkPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Network"
        subtitle="Explore relationships between tenders, entities, directors, and addresses. Click a company node to inspect it."
        actions={
          <>
            <GlassButton variant="default" size="md"><Filter className="h-4 w-4" />Filter</GlassButton>
            <GlassButton variant="default" size="icon" aria-label="Fullscreen"><Maximize2 className="h-4 w-4" /></GlassButton>
          </>
        }
      />

      <GlassCard level="panel" className="relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" style={{ boxShadow: "0 0 8px var(--accent)" }} />
            <span className="text-sm font-medium text-foreground">Highway Resurfacing — relationship cluster</span>
          </div>
          <GlassBadge tone="violet">10 entities · 11 links</GlassBadge>
        </div>
        <div
          className="h-[560px] w-full"
          style={{ background: "radial-gradient(70% 60% at 50% 45%, rgba(34,211,238,0.05), transparent 70%)" }}
        >
          <NetworkGraph onSelectCompany={setCompanyId} />
        </div>
      </GlassCard>

      <CompanyDrawer companyId={companyId} onClose={() => setCompanyId(null)} />
    </div>
  )
}
