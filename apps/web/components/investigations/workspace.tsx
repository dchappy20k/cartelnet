"use client"

import { useEffect, useState } from "react"
import { X, UserPlus, StickyNote, Eye, ArrowUpCircle, FileOutput, CheckCircle2, ShieldAlert, Send } from "lucide-react"
import type { Investigation } from "@/lib/data"
import { GlassTabs } from "@/components/glass/glass-tabs"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import { RiskBadge } from "@/components/glass/risk-badge"
import { SignalRow } from "@/components/signals/signal-row"
import {
  getInvestigationDetail,
  addInvestigationNote,
  updateInvestigation,
  generateReport,
  type ApiInvestigationDetail,
} from "@/lib/api-client"

const SECTIONS = ["Summary", "Evidence", "Entities", "Timeline", "Notes"]

export function InvestigationWorkspace({
  investigation,
  onClose,
  onUpdated,
}: {
  investigation: any | null
  onClose: () => void
  onUpdated?: () => void
}) {
  const [tab, setTab] = useState("Summary")
  const [detail, setDetail] = useState<ApiInvestigationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  const caseRef = investigation?.case_ref || investigation?.id

  useEffect(() => {
    if (!caseRef) return
    setTab("Summary")
    setLoading(true)

    getInvestigationDetail(caseRef)
      .then((d) => setDetail(d))
      .finally(() => setLoading(false))

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [caseRef, onClose])

  if (!investigation) return null

  const inv = detail || investigation

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setIsSubmittingNote(true)
    try {
      const added = await addInvestigationNote(inv.case_ref || inv.id, newNote.trim(), "Investigator")
      setDetail((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          notes: [added, ...prev.notes],
        }
      })
      setNewNote("")
      if (onUpdated) onUpdated()
    } catch (err) {
      console.error("Failed to add note:", err)
    } finally {
      setIsSubmittingNote(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updated = await updateInvestigation(inv.case_ref || inv.id, {
        status: newStatus,
        note: `Case status changed to ${newStatus} by investigator.`,
      })
      setDetail((prev) => (prev ? { ...prev, status: updated.status } : null))
      if (onUpdated) onUpdated()
    } catch (err) {
      console.error("Failed to update status:", err)
    }
  }

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    try {
      const rep = await generateReport({
        report_type: "INVESTIGATION_CASE_DOSSIER",
        target_id: inv.case_ref || inv.id,
        format: "HTML",
        auditor_name: inv.investigator || "Chief Auditor",
      })

      if (rep.rendered_content) {
        const blob = new Blob([rep.rendered_content], { type: "text/html" })
        const url = URL.createObjectURL(blob)
        window.open(url, "_blank")
      }
    } catch (err) {
      console.error("Failed to generate report:", err)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 animate-overlay-in bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 ml-auto flex h-full w-full max-w-5xl animate-drawer-in flex-col glass-chrome" role="dialog" aria-modal="true">
        {/* header */}
        <header className="flex items-start justify-between gap-4 border-b border-white/8 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-lg font-semibold text-foreground">{inv.case_ref || inv.id}</span>
              <GlassBadge tone="violet">{inv.priority} Priority</GlassBadge>
              <GlassBadge tone={inv.status === "Escalated" ? "violet" : inv.status === "Closed" ? "muted" : "accent"}>
                {inv.status}
              </GlassBadge>
            </div>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{inv.title}</p>
          </div>
          <button onClick={onClose} className="glass-control flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* main */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-white/8 p-4">
              <GlassTabs tabs={SECTIONS} active={tab} onChange={setTab} />
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin p-5">
              {tab === "Summary" && (
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-risk-medium" />
                    Risk signals detected · Requires human review · No determination of wrongdoing
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    This investigation aggregates {inv.signals_count || inv.signals || 0} risk signals across{" "}
                    {inv.entities_count || inv.entities || 0} entities linked to tender{" "}
                    <span className="text-foreground font-mono">{inv.tender_ref || inv.tender || "TND-8842"}</span>.
                    Signals include statistical price clustering, shared directorship, and common registered headquarters.
                    The case is currently <span className="text-foreground">{inv.status.toLowerCase()}</span> and assigned
                    to <span className="text-foreground">{inv.investigator}</span>.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Entities", inv.entities_count || inv.entities || 0],
                      ["Signals", inv.signals_count || inv.signals || 0],
                      ["Created", inv.created_at ? new Date(inv.created_at).toLocaleDateString() : inv.opened || "Recent"],
                      ["Tender", inv.tender_ref || inv.tender || "N/A"],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="rounded-lg border border-white/8 bg-white/[0.03] p-3">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</div>
                        <div className="mt-1 truncate font-mono text-sm text-foreground">{v}</div>
                      </div>
                    ))}
                  </div>

                  {detail?.tender_title && (
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4 text-xs space-y-1.5">
                      <div className="font-semibold text-foreground">Linked Tender: {detail.tender_title}</div>
                      <div className="text-muted-foreground">Authority: {detail.tender_authority} · Value: ${detail.tender_value?.toLocaleString()}</div>
                    </div>
                  )}
                </div>
              )}

              {tab === "Evidence" && (
                <div className="space-y-3">
                  {detail?.signals && detail.signals.length > 0 ? (
                    detail.signals.map((s: any) => (
                      <div key={s.id} className="rounded-lg border border-white/8 bg-white/[0.03] p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-foreground">{s.title}</span>
                          <RiskBadge level={s.severity.toLowerCase()} />
                        </div>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                        {s.explanation && (
                          <div className="text-xs text-muted-foreground border-l-2 border-accent/40 pl-3 mt-2">
                            <strong>Explanation:</strong> {s.explanation}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground p-4">No risk signals currently attached.</div>
                  )}
                </div>
              )}

              {tab === "Entities" && (
                <div className="space-y-2">
                  {detail?.bidders && detail.bidders.length > 0 ? (
                    detail.bidders.map((b: any) => (
                      <div key={b.bid_id} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] p-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">{b.company_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">Bid: ${b.amount?.toLocaleString()} ({b.status})</div>
                        </div>
                        <GlassBadge tone={b.status === "Awarded" ? "accent" : "default"}>{b.status}</GlassBadge>
                      </div>
                    ))
                  ) : (
                    ["Meridian Civil Works Ltd.", "Apex Infrastructure Group", "Northgate Contracting", "Arthur Vance (Director)"].map((e, i) => (
                      <div key={e} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] p-3">
                        <span className="text-sm text-foreground">{e}</span>
                        <RiskBadge level={i === 0 ? "high" : i === 3 ? "critical" : "medium"} />
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "Timeline" && (
                <ol className="relative space-y-5 border-l border-white/10 pl-6">
                  {detail?.notes && detail.notes.length > 0 ? (
                    detail.notes.map((n: any, i: number) => (
                      <li key={n.id || i} className="relative">
                        <span className="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full bg-accent" style={{ boxShadow: "0 0 8px var(--accent)" }} />
                        <div className="font-mono text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()} · {n.author_name}</div>
                        <div className="mt-0.5 text-sm text-foreground">{n.content}</div>
                      </li>
                    ))
                  ) : (
                    <li className="relative">
                      <span className="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full bg-accent" style={{ boxShadow: "0 0 8px var(--accent)" }} />
                      <div className="font-mono text-xs text-muted-foreground">Recent</div>
                      <div className="mt-0.5 text-sm text-foreground">Investigation case created</div>
                    </li>
                  )}
                </ol>
              )}

              {tab === "Notes" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add an investigator observation or registry finding…"
                      rows={3}
                      className="glass-control w-full resize-none rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <GlassButton
                        variant="accent"
                        size="md"
                        onClick={handleAddNote}
                        disabled={isSubmittingNote || !newNote.trim()}
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Log Note
                      </GlassButton>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {detail?.notes && detail.notes.length > 0 ? (
                      detail.notes.map((n: any) => (
                        <div key={n.id} className="rounded-lg border border-white/8 bg-white/[0.03] p-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{n.author_name}</span>
                            <span className="font-mono">{new Date(n.created_at).toLocaleString()}</span>
                          </div>
                          <p className="mt-1.5 text-sm text-muted-foreground">{n.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground p-3">No notes logged yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* action panel */}
          <aside className="hidden w-64 shrink-0 border-l border-white/8 p-4 md:block">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Case Actions</h4>
            <div className="space-y-2">
              <GlassButton
                variant="accent"
                size="md"
                className="w-full justify-start"
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
              >
                <FileOutput className="h-4 w-4 mr-2" />
                {isGeneratingReport ? "Generating..." : "Generate Audit Report"}
              </GlassButton>

              <GlassButton
                variant="default"
                size="md"
                className="w-full justify-start"
                onClick={() => handleStatusChange("Under Review")}
              >
                <Eye className="h-4 w-4 mr-2" />
                Mark Under Review
              </GlassButton>

              <GlassButton
                variant="default"
                size="md"
                className="w-full justify-start"
                onClick={() => handleStatusChange("Escalated")}
              >
                <ArrowUpCircle className="h-4 w-4 mr-2 text-violet-400" />
                Escalate Case
              </GlassButton>

              <GlassButton
                variant="danger"
                size="md"
                className="w-full justify-start"
                onClick={() => handleStatusChange("Closed")}
              >
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" />
                Close Case
              </GlassButton>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
