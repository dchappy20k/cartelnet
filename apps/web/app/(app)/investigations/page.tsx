"use client"

import { useState, useEffect } from "react"
import { Plus, RefreshCw, X, ShieldAlert, FolderOpen } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import { InvestigationWorkspace } from "@/components/investigations/workspace"
import { listInvestigations, createInvestigation, type ApiInvestigation } from "@/lib/api-client"
import { cn } from "@/lib/utils"

const statusTone: Record<string, "accent" | "violet" | "muted" | "default"> = {
  "Under Review": "accent",
  Escalated: "violet",
  Open: "default",
  Closed: "muted",
}

const priorityColor: Record<string, string> = {
  Critical: "text-risk-critical font-bold",
  High: "text-risk-high",
  Medium: "text-risk-medium",
  Low: "text-muted-foreground",
}

export default function InvestigationsPage() {
  const [cases, setCases] = useState<ApiInvestigation[]>([])
  const [active, setActive] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Modal form fields
  const [title, setTitle] = useState("")
  const [tenderId, setTenderId] = useState("TND-8842")
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Critical")
  const [investigator, setInvestigator] = useState("Lead Investigator")
  const [initialNote, setInitialNote] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const loadCases = () => {
    setLoading(true)
    listInvestigations()
      .then((data) => setCases(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCases()
  }, [])

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsCreating(true)
    try {
      const newCase = await createInvestigation({
        title: title.trim(),
        tender_id: tenderId,
        priority,
        investigator: investigator.trim() || "Unassigned",
        initial_note: initialNote.trim() || undefined,
      })
      setIsModalOpen(false)
      setTitle("")
      setInitialNote("")
      loadCases()
      setActive(newCase)
    } catch (err) {
      console.error("Failed to create investigation case:", err)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Investigations"
        subtitle="Structured cases of flagged procurement anomalies. Evidence logs require human integrity review."
        actions={
          <div className="flex items-center gap-2">
            <GlassButton variant="default" size="md" onClick={loadCases} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </GlassButton>
            <GlassButton variant="accent" size="md" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Investigation
            </GlassButton>
          </div>
        }
      />

      {/* Case Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {cases.map((inv) => (
          <GlassCard
            key={inv.id || inv.case_ref}
            hover
            className="cursor-pointer p-5 transition-transform hover:-translate-y-0.5"
            onClick={() => setActive(inv)}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-accent">{inv.case_ref || inv.id}</span>
              <GlassBadge tone={statusTone[inv.status] || "default"}>{inv.status}</GlassBadge>
            </div>
            <h3 className="mt-2 text-sm font-medium leading-snug text-foreground">{inv.title}</h3>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span className={cn("font-medium", priorityColor[inv.priority] || "text-foreground")}>
                {inv.priority} priority
              </span>
              <span>{inv.investigator}</span>
            </div>
            <div className="mt-3 flex gap-4 border-t border-white/8 pt-3 text-xs text-muted-foreground">
              <span>
                <span className="font-mono text-foreground font-semibold">{inv.entities_count ?? 3}</span> entities
              </span>
              <span>
                <span className="font-mono text-foreground font-semibold">{inv.signals_count ?? 2}</span> signals
              </span>
              <span className="ml-auto font-mono">
                {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "Recent"}
              </span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-white/10 bg-[#0e131f] p-6 shadow-2xl glass-chrome">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-accent" />
                Open Investigation Case
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Case Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bid Clustering Inquiry — Highway Resurfacing"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glass-control w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Linked Tender</label>
                  <select
                    value={tenderId}
                    onChange={(e) => setTenderId(e.target.value)}
                    className="glass-control w-full rounded-lg px-3 py-2 text-sm text-foreground bg-[#141b2d] focus:outline-none"
                  >
                    <option value="TND-8842">TND-8842 (Highway Resurfacing)</option>
                    <option value="TND-8755">TND-8755 (City Rail Signalling)</option>
                    <option value="TND-8817">TND-8817 (Water Treatment)</option>
                    <option value="TND-8790">TND-8790 (Hospital IT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="glass-control w-full rounded-lg px-3 py-2 text-sm text-foreground bg-[#141b2d] focus:outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Assigned Investigator</label>
                <input
                  type="text"
                  placeholder="e.g. Marcus Vance"
                  value={investigator}
                  onChange={(e) => setInvestigator(e.target.value)}
                  className="glass-control w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Initial Audit Note</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Opening formal review based on automated CV <= 1.5% and shared directorship signal."
                  value={initialNote}
                  onChange={(e) => setInitialNote(e.target.value)}
                  className="glass-control w-full resize-none rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/8">
                <GlassButton type="button" variant="default" size="md" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="accent" size="md" disabled={isCreating || !title.trim()}>
                  {isCreating ? "Opening Case..." : "Create Case"}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case 360 Workspace Drawer */}
      <InvestigationWorkspace
        investigation={active}
        onClose={() => setActive(null)}
        onUpdated={loadCases}
      />
    </div>
  )
}
