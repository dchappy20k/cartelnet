"use client"

import { useEffect, useState } from "react"
import { Building2, MapPin, Calendar, Users, Award, ShieldAlert, FileText } from "lucide-react"
import { GlassDrawer } from "@/components/glass/glass-drawer"
import { GlassButton } from "@/components/glass/glass-button"
import { RiskBadge } from "@/components/glass/risk-badge"
import { getCompanyDossier, type ApiCompanyDossier } from "@/lib/api-client"

export function CompanyDrawer({ companyId, onClose }: { companyId: string | null; onClose: () => void }) {
  const [dossier, setDossier] = useState<ApiCompanyDossier | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!companyId) {
      setDossier(null)
      return
    }

    let active = true
    setLoading(true)

    getCompanyDossier(companyId)
      .then((data) => {
        if (active) setDossier(data)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [companyId])

  const riskLevel = dossier && dossier.risk_signals.length > 0 
    ? (dossier.risk_signals[0].severity as any) 
    : "low"

  return (
    <GlassDrawer
      open={!!companyId}
      onClose={onClose}
      title={dossier ? dossier.legal_name : "Loading entity..."}
      subtitle={dossier ? `${dossier.id} · ${dossier.status}` : undefined}
      footer={
        <div className="flex gap-2">
          <GlassButton variant="accent" size="md" className="flex-1">
            <ShieldAlert className="h-4 w-4 mr-1.5" />
            Open Investigation
          </GlassButton>
          <GlassButton variant="default" size="md" className="flex-1">
            <FileText className="h-4 w-4 mr-1.5" />
            Export Dossier
          </GlassButton>
        </div>
      }
    >
      {dossier ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Screening Classification</span>
            <RiskBadge level={riskLevel} />
          </div>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Corporate Registry Information
            </h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5 text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" /> {dossier.legal_name}
              </div>
              <div className="flex items-center gap-2.5 text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" /> {dossier.address || "Registered Address on file"}
              </div>
              {dossier.tax_id && (
                <div className="flex items-center gap-2.5 text-foreground">
                  <span className="text-xs font-mono text-muted-foreground">TAX ID:</span> {dossier.tax_id}
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-3 gap-3">
            {[
              { label: "Bids Submitted", value: dossier.total_bids },
              { label: "Tenders Won", value: dossier.won_tenders },
              { label: "Win Rate", value: `${dossier.win_rate}%` },
              { label: "Risk Signals", value: dossier.risk_signals.length, tone: dossier.risk_signals.length > 0 ? "risk" : "normal" },
              { label: "Co-Bidders", value: dossier.co_bidders.length },
              { label: "Officers", value: dossier.directors.length },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-white/8 bg-white/[0.03] p-3">
                <div className={`font-mono text-2xl font-semibold ${s.tone === "risk" ? "text-risk-high" : "text-foreground"}`}>
                  {s.value}
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </section>

          {/* Directors */}
          {dossier.directors.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Connected Directors & Officers
              </h4>
              <div className="space-y-2">
                {dossier.directors.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border border-white/6 bg-white/[0.02] px-3 py-2 text-sm">
                    <span className="font-medium text-foreground">{d.full_name}</span>
                    <span className="text-xs text-muted-foreground">{d.role}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Co-Bidders */}
          {dossier.co_bidders.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Historical Co-Bidders
              </h4>
              <div className="space-y-2">
                {dossier.co_bidders.map((cb) => (
                  <div key={cb.company_id} className="flex items-center justify-between rounded-md border border-white/6 bg-white/[0.02] px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-foreground">{cb.company_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {cb.joint_tenders_count} shared tender{cb.joint_tenders_count > 1 ? "s" : ""}
                        {cb.shared_directors_count > 0 && ` · ${cb.shared_directors_count} shared officer`}
                        {cb.shared_address && " · Shared address"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Risk Signals */}
          {dossier.risk_signals.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Detected Procurement Risk Signals
              </h4>
              <div className="space-y-2">
                {dossier.risk_signals.map((sig) => (
                  <div key={sig.id} className="rounded-md border border-risk-high/30 bg-risk-high/10 p-3 text-xs">
                    <div className="font-semibold text-risk-high">{sig.title}</div>
                    <div className="mt-1 text-muted-foreground">{sig.description}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          {loading ? "Loading entity dossier..." : "Select an entity to view details"}
        </div>
      )}
    </GlassDrawer>
  )
}
