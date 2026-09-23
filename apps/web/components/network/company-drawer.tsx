"use client"

import { Building2, MapPin, Calendar } from "lucide-react"
import { GlassDrawer } from "@/components/glass/glass-drawer"
import { GlassButton } from "@/components/glass/glass-button"
import { RiskBadge } from "@/components/glass/risk-badge"
import { companies } from "@/lib/data"

export function CompanyDrawer({ companyId, onClose }: { companyId: string | null; onClose: () => void }) {
  const company = companyId ? companies[companyId] : null

  return (
    <GlassDrawer
      open={!!company}
      onClose={onClose}
      title={company?.name}
      subtitle={company ? `${company.id} · ${company.status}` : undefined}
      footer={
        <div className="flex gap-2">
          <GlassButton variant="accent" size="md" className="flex-1">Open Investigation</GlassButton>
          <GlassButton variant="default" size="md" className="flex-1">View Profile</GlassButton>
        </div>
      }
    >
      {company && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Risk classification</span>
            <RiskBadge level={company.risk} />
          </div>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity Information</h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5 text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" /> {company.name}
              </div>
              <div className="flex items-center gap-2.5 text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" /> {company.registered}
              </div>
              <div className="flex items-center gap-2.5 text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" /> Incorporated {company.incorporated}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-3">
            {[
              { label: "Tenders", value: company.tenders },
              { label: "Wins", value: company.wins },
              { label: "Losses", value: company.losses },
              { label: "Risk Signals", value: company.signals, tone: "risk" },
              { label: "Relationships", value: company.relationships },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-white/8 bg-white/[0.03] p-3">
                <div className={`font-mono text-2xl font-semibold ${s.tone === "risk" ? "text-risk-high" : "text-foreground"}`}>
                  {s.value}
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Activity</h4>
            <ol className="relative space-y-4 border-l border-white/10 pl-5">
              {company.activity.map((a, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[23px] top-1 h-2 w-2 rounded-full bg-accent" style={{ boxShadow: "0 0 6px var(--accent)" }} />
                  <div className="text-sm text-foreground">{a.label}</div>
                  <div className="text-xs text-muted-foreground">{a.time}</div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </GlassDrawer>
  )
}
