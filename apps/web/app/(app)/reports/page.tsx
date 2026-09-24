"use client"

import { useState, useEffect } from "react"
import {
  FileText,
  Fingerprint,
  ShieldAlert,
  FileDown,
  Eye,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import { RiskBadge } from "@/components/glass/risk-badge"
import { cn } from "@/lib/utils"
import {
  listTenders,
  getInvestigations,
  downloadReportPdf,
  getReportPdfUrl,
  API_BASE,
} from "@/lib/api-client"

const reportTypes = [
  {
    id: "tender",
    code: "TENDER_RISK_AUDIT" as const,
    name: "Tender Risk Audit Dossier",
    desc: "Complete statistical variance, bidding spreads, shared directorship, and collusion risk screen",
    icon: FileText,
  },
  {
    id: "investigation",
    code: "INVESTIGATION_CASE_DOSSIER" as const,
    name: "Investigation Case Dossier",
    desc: "Formal case file documenting participating entities, evidence logs, and timeline notes",
    icon: Fingerprint,
  },
]

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<"tender" | "investigation">("tender")
  const [tendersList, setTendersList] = useState<any[]>([])
  const [investigationsList, setInvestigationsList] = useState<any[]>([])
  const [selectedTargetId, setSelectedTargetId] = useState<string>("TND-8842")
  const [isDownloading, setIsDownloading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [loadingTargets, setLoadingTargets] = useState(true)

  // Load available tenders and investigations from backend
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingTargets(true)
        const [tendersData, invsData] = await Promise.all([
          listTenders().catch(() => []),
          getInvestigations().catch(() => []),
        ])

        if (tendersData && tendersData.length > 0) {
          setTendersList(tendersData)
          if (selectedType === "tender") {
            setSelectedTargetId(tendersData[0].tender_ref || "TND-8842")
          }
        } else {
          // Fallback defaults if not seeded
          setTendersList([
            { id: "TND-8842", tender_ref: "TND-8842", title: "A-10 Highway Resurfacing", authority: "Dept of Transportation", risk_level: "critical", risk_score: 88, estimated_value: 12500000 },
            { id: "TND-9011", tender_ref: "TND-9011", title: "Metropolitan Water Treatment Phase 2", authority: "Water Works Authority", risk_level: "high", risk_score: 74, estimated_value: 34000000 },
            { id: "TND-8703", tender_ref: "TND-8703", title: "Civil Hospital Medical Equipment", authority: "Ministry of Health", risk_level: "medium", risk_score: 55, estimated_value: 8200000 },
          ])
        }

        if (invsData && invsData.length > 0) {
          setInvestigationsList(invsData)
        } else {
          setInvestigationsList([
            { id: "INV-2026-001", case_ref: "INV-2026-001", title: "Highway Resurfacing Bid Rigging Inquest", status: "Under Review", priority: "High" },
          ])
        }
      } finally {
        setLoadingTargets(false)
      }
    }
    loadData()
  }, [])

  // Update selected target when switching report types
  const handleTypeChange = (type: "tender" | "investigation") => {
    setSelectedType(type)
    if (type === "tender") {
      const firstTender = tendersList[0]?.tender_ref || "TND-8842"
      setSelectedTargetId(firstTender)
    } else {
      const firstInv = investigationsList[0]?.case_ref || "INV-2026-001"
      setSelectedTargetId(firstInv)
    }
  }

  const currentReportType = reportTypes.find((r) => r.id === selectedType)!

  // Selected item metadata
  const currentTender = tendersList.find(
    (t) => t.tender_ref === selectedTargetId || t.id === selectedTargetId
  ) || tendersList[0]

  const currentInv = investigationsList.find(
    (i) => i.case_ref === selectedTargetId || i.id === selectedTargetId
  ) || investigationsList[0]

  // Handle PDF Download
  const handleDownloadPdf = async () => {
    if (!selectedTargetId) return
    try {
      setIsDownloading(true)
      const filename =
        selectedType === "tender"
          ? `CartelNet_Risk_Audit_${selectedTargetId}.pdf`
          : `CartelNet_Investigation_${selectedTargetId}.pdf`
      await downloadReportPdf(selectedTargetId, filename)
    } catch (err) {
      console.error("PDF download error:", err)
      // Direct window open fallback
      const fallbackUrl = `${API_BASE}/reports/public/download/${encodeURIComponent(selectedTargetId)}`
      window.open(fallbackUrl, "_blank")
    } finally {
      setIsDownloading(false)
    }
  }

  // Handle Copying Public Link
  const handleCopyPublicLink = () => {
    const publicUrl = `${API_BASE}/reports/public/download/${encodeURIComponent(selectedTargetId)}`
    navigator.clipboard.writeText(publicUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 3000)
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Reports & Public Disclosures"
        subtitle="Generate and download institutional-grade PDF risk intelligence dossiers for oversight, audit, and public transparency."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Report Configuration */}
        <div className="space-y-4 lg:col-span-1">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              1. Select Dossier Type
            </h2>
            <div className="mt-2 space-y-2">
              {reportTypes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleTypeChange(r.id as "tender" | "investigation")}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-all",
                    selectedType === r.id
                      ? "border-accent/40 bg-accent/[0.07] shadow-[0_0_15px_rgba(2,132,199,0.15)]"
                      : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                      selectedType === r.id
                        ? "border-accent/40 text-accent bg-accent/10"
                        : "border-white/10 text-muted-foreground"
                    )}
                  >
                    <r.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">{r.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{r.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              2. Select Target Subject
            </h2>
            <div className="mt-2">
              {selectedType === "tender" ? (
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  {tendersList.map((t) => (
                    <option key={t.id || t.tender_ref} value={t.tender_ref || t.id}>
                      {t.tender_ref || t.id} — {t.title} ({t.risk_level?.toUpperCase() || "SCREENED"})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  {investigationsList.map((i) => (
                    <option key={i.id || i.case_ref} value={i.case_ref || i.id}>
                      {i.case_ref || i.id} — {i.title} ({i.status})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Public Transparency Badge */}
          <GlassCard className="p-4 border-accent/20 bg-accent/[0.03]">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground block mb-0.5">Public Open Access</span>
                All exported reports are cryptographically signed with date-stamps and include source provenance
                and non-negotiable legal decision-support notices.
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Live Document Preview & Actions */}
        <GlassCard level="panel" className="flex flex-col lg:col-span-2">
          {/* Card Top Header */}
          <div className="flex items-center justify-between border-b border-white/8 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/30 bg-accent/10 text-accent">
                <currentReportType.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-foreground">
                  {selectedType === "tender"
                    ? `Audit Dossier: ${selectedTargetId}`
                    : `Investigation File: ${selectedTargetId}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  Format: Institutional Vector PDF (ISO 32000 compliant) · Ready for Download
                </div>
              </div>
            </div>
            <GlassBadge tone="accent">PDF Ready</GlassBadge>
          </div>

          {/* Document Preview Surface */}
          <div className="flex-1 p-5 space-y-4">
            <div className="rounded-lg border border-white/10 bg-slate-950/60 p-6 space-y-4 shadow-inner">
              {/* Document Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs font-mono tracking-widest text-accent uppercase font-bold">
                    CARTELNET PROCUREMENT INTELLIGENCE
                  </div>
                  <div className="mt-1 text-lg font-bold text-foreground">
                    {selectedType === "tender"
                      ? (currentTender?.title || "Procurement Tender Risk Audit")
                      : (currentInv?.title || "Investigation Case File")}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Reference Code: <span className="font-mono text-foreground font-semibold">{selectedTargetId}</span>
                  </div>
                </div>

                <div className="text-right text-xs space-y-1">
                  <div className="text-muted-foreground">Classification: <span className="text-emerald-400 font-semibold">PUBLIC DISCLOSURE</span></div>
                  <div className="text-muted-foreground">Status: <span className="text-foreground">Official Audit Copy</span></div>
                  <div className="text-muted-foreground">Engine: <span className="text-accent">Deterministic v1.0</span></div>
                </div>
              </div>

              {/* Subject Metrics Bar */}
              {selectedType === "tender" && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-md border border-white/8 bg-white/[0.02] p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Risk Rating</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xl font-bold text-foreground">
                        {currentTender?.risk_score ?? 88}/100
                      </span>
                      <RiskBadge level={currentTender?.risk_level || "high"} />
                    </div>
                  </div>

                  <div className="rounded-md border border-white/8 bg-white/[0.02] p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Estimated Value</div>
                    <div className="mt-1 text-base font-semibold text-foreground">
                      ${((currentTender?.estimated_value || 12500000) / 1000000).toFixed(2)}M
                    </div>
                  </div>

                  <div className="rounded-md border border-white/8 bg-white/[0.02] p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Bidders Screened</div>
                    <div className="mt-1 text-base font-semibold text-foreground">
                      {currentTender?.bids?.length || 3} Entities
                    </div>
                  </div>

                  <div className="rounded-md border border-white/8 bg-white/[0.02] p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Authority</div>
                    <div className="mt-1 text-xs font-medium text-foreground truncate" title={currentTender?.authority}>
                      {currentTender?.authority || "Public Authority"}
                    </div>
                  </div>
                </div>
              )}

              {/* Executive Summary Preview Box */}
              <div className="rounded-md border border-accent/20 bg-accent/[0.04] p-4 text-xs text-foreground/90 leading-relaxed">
                <span className="font-semibold text-accent block mb-1">Executive Summary:</span>
                {selectedType === "tender"
                  ? `Automated screening of ${selectedTargetId} identified anomalous bid clustering with narrow price variance and relational director linkages. Findings have been attached with empirical coefficient of variation (CV) metrics and source registries for human compliance verification.`
                  : `Investigation case opened under priority supervision. Contains logged auditor notes, linked evidentiary materials, and company cluster intelligence.`}
              </div>

              {/* Mandatory Legal & Ethical Notice */}
              <div className="rounded-md border border-amber-500/20 bg-amber-500/[0.03] p-3 text-[11px] text-amber-200/80 leading-normal flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Mandatory Regulatory Notice:</strong> This report presents risk indicators detected through
                  automated decision-support algorithms. Findings highlight statistical, relational, and behavioral
                  anomalies for human integrity review and do not constitute a determination of criminal wrongdoing or legal guilt.
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 p-5 bg-white/[0.01]">
            <div className="flex flex-wrap items-center gap-2">
              <GlassButton
                variant="accent"
                size="md"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Download Official PDF
                  </>
                )}
              </GlassButton>

              <GlassButton
                variant="default"
                size="md"
                onClick={handleCopyPublicLink}
                className="gap-2 text-xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Public Download Link
                  </>
                )}
              </GlassButton>
            </div>

            <a
              href={`${API_BASE}/reports/public/download/${encodeURIComponent(selectedTargetId)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              Direct Public URL
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
