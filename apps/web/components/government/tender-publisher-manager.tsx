"use client"

import { useState, useEffect } from "react"
import {
  Building2,
  Database,
  Radio,
  Clock,
  Coins,
  Users,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Code,
  FileText,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Layers,
  Award,
} from "lucide-react"
import Link from "next/link"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import {
  publishTender,
  manageTender,
  addTenderBidder,
  getTenderProjectStatus,
  listTenders,
  formatCurrency,
  type PublishTenderRequest,
  type BidderInput,
  type TenderProjectStatusOut,
  type TenderManagementUpdate,
} from "@/lib/api-client"
import { cn } from "@/lib/utils"

const DEFAULT_SAMPLE_JSON: PublishTenderRequest = {
  department_name: "Ministry of Transportation & Highways",
  department_code: "MTH-NAT",
  tender_ref: "TDR-2026-EXPWY-09",
  title: "Northern Corridor Highway Asphalt Resurfacing & Bridge Reinforcement",
  category: "Infrastructure",
  location: "Northern Province, Sector 12",
  estimated_value: 12500000,
  status: "Live",
  progress_stage: "Live & Accepting Bids",
  publication_date: new Date().toISOString().split("T")[0],
  closing_date: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
  bidders: [
    {
      company_name: "Apex Paving & Construction Ltd",
      bid_amount: 12350000,
      bid_status: "Submitted",
      registered_address: "108 Industrial Blvd, Sector 4, Northern District",
      directors: ["David Vance", "Elena Rostova"],
    },
    {
      company_name: "Sterling Infrastructure Group",
      bid_amount: 12420000,
      bid_status: "Submitted",
      registered_address: "214 Commercial Avenue, Suite 300",
      directors: ["Marcus Sterling"],
    },
    {
      company_name: "Summit Roadworks & Civils Ltd",
      bid_amount: 12380000,
      bid_status: "Submitted",
      registered_address: "108 Industrial Blvd, Sector 4, Northern District",
      directors: ["Elena Rostova", "Julian Thorne"],
    },
  ],
}

export function TenderPublisherManager() {
  const [activeTab, setActiveTab] = useState<"publish" | "manage">("manage")
  const [editorMode, setEditorMode] = useState<"form" | "json">("form")

  // Form State
  const [departmentName, setDepartmentName] = useState(DEFAULT_SAMPLE_JSON.department_name || "")
  const [departmentCode, setDepartmentCode] = useState(DEFAULT_SAMPLE_JSON.department_code || "")
  const [tenderRef, setTenderRef] = useState(DEFAULT_SAMPLE_JSON.tender_ref)
  const [title, setTitle] = useState(DEFAULT_SAMPLE_JSON.title)
  const [category, setCategory] = useState(DEFAULT_SAMPLE_JSON.category || "Infrastructure")
  const [location, setLocation] = useState(DEFAULT_SAMPLE_JSON.location || "")
  const [estimatedValue, setEstimatedValue] = useState<number>(DEFAULT_SAMPLE_JSON.estimated_value)
  const [status, setStatus] = useState<string>(DEFAULT_SAMPLE_JSON.status || "Live")
  const [progressStage, setProgressStage] = useState<string>(DEFAULT_SAMPLE_JSON.progress_stage || "Live & Accepting Bids")
  const [closingDate, setClosingDate] = useState<string>(DEFAULT_SAMPLE_JSON.closing_date || "")

  // Dynamic Bidders List
  const [bidders, setBidders] = useState<Array<BidderInput & { id: string }>>(
    (DEFAULT_SAMPLE_JSON.bidders || []).map((b, idx) => ({ ...b, id: `bidder-${idx}` }))
  )

  // JSON string for raw editor
  const [rawJson, setRawJson] = useState<string>(JSON.stringify(DEFAULT_SAMPLE_JSON, null, 2))
  const [jsonParseError, setJsonParseError] = useState<string | null>(null)

  // Publishing Execution State
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)

  // Project Management State
  const [allTendersList, setAllTendersList] = useState<any[]>([])
  const [selectedTenderRef, setSelectedTenderRef] = useState<string>("")
  const [managedStatus, setManagedStatus] = useState<TenderProjectStatusOut | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [statusUpdateMessage, setStatusUpdateMessage] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Add Bidder Modal inside Manager
  const [showAddBidderModal, setShowAddBidderModal] = useState(false)
  const [newBidderName, setNewBidderName] = useState("")
  const [newBidderAmount, setNewBidderAmount] = useState<number | "">("")
  const [newBidderStatus, setNewBidderStatus] = useState("Submitted")
  const [newBidderAddress, setNewBidderAddress] = useState("")
  const [newBidderDirectors, setNewBidderDirectors] = useState("")
  const [isSubmittingBidder, setIsSubmittingBidder] = useState(false)

  // Status & Progress update controls
  const [editStatus, setEditStatus] = useState("Live")
  const [editStage, setEditStage] = useState("Live & Accepting Bids")

  // Load existing tenders on mount
  useEffect(() => {
    fetchTendersList()
  }, [])

  async function fetchTendersList(selectLatestRef?: string) {
    try {
      const data = await listTenders()
      setAllTendersList(data)
      if (selectLatestRef) {
        setSelectedTenderRef(selectLatestRef)
        loadProjectStatus(selectLatestRef)
      } else if (data.length > 0 && !selectedTenderRef) {
        setSelectedTenderRef(data[0].tender_ref)
        loadProjectStatus(data[0].tender_ref)
      }
    } catch (err) {
      console.error("Failed to load tenders list:", err)
    }
  }

  async function loadProjectStatus(ref: string) {
    if (!ref) return
    setIsLoadingStatus(true)
    setStatusUpdateMessage(null)
    try {
      const res = await getTenderProjectStatus(ref)
      setManagedStatus(res)
      setEditStatus(res.status)
      setEditStage(res.progress_stage)
    } catch (err: any) {
      console.error("Failed to fetch project status:", err)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  // Synchronize form state to raw JSON when switching to JSON mode
  function handleSwitchToJSON() {
    const payload: PublishTenderRequest = {
      department_name: departmentName,
      department_code: departmentCode,
      tender_ref: tenderRef,
      title: title,
      category: category,
      location: location,
      estimated_value: estimatedValue,
      status: status,
      progress_stage: progressStage,
      closing_date: closingDate,
      bidders: bidders.map(({ id, ...rest }) => rest),
    }
    setRawJson(JSON.stringify(payload, null, 2))
    setJsonParseError(null)
    setEditorMode("json")
  }

  // Synchronize raw JSON to form state when switching to Form mode
  function handleSwitchToForm() {
    try {
      const parsed = JSON.parse(rawJson)
      setDepartmentName(parsed.department_name || "")
      setDepartmentCode(parsed.department_code || "")
      setTenderRef(parsed.tender_ref || "")
      setTitle(parsed.title || "")
      setCategory(parsed.category || "Infrastructure")
      setLocation(parsed.location || "")
      setEstimatedValue(Number(parsed.estimated_value) || 0)
      setStatus(parsed.status || "Live")
      setProgressStage(parsed.progress_stage || "Live & Accepting Bids")
      setClosingDate(parsed.closing_date || "")
      if (Array.isArray(parsed.bidders)) {
        setBidders(
          parsed.bidders.map((b: any, idx: number) => ({
            ...b,
            id: `bidder-${idx}-${Date.now()}`,
          }))
        )
      }
      setJsonParseError(null)
      setEditorMode("form")
    } catch (err: any) {
      setJsonParseError(`Invalid JSON syntax: ${err.message}. Please fix errors before switching.`)
    }
  }

  // Add bidder row to form
  function handleAddBidderRow() {
    setBidders((prev) => [
      ...prev,
      {
        id: `bidder-${Date.now()}`,
        company_name: "",
        bid_amount: 0,
        bid_status: "Submitted",
        registered_address: "",
        directors: [],
      },
    ])
  }

  function handleRemoveBidderRow(id: string) {
    setBidders((prev) => prev.filter((b) => b.id !== id))
  }

  function handleBidderChange(id: string, field: keyof BidderInput, value: any) {
    setBidders((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b
        if (field === "directors" && typeof value === "string") {
          return {
            ...b,
            directors: value
              .split(",")
              .map((d) => d.trim())
              .filter(Boolean),
          }
        }
        return { ...b, [field]: value }
      })
    )
  }

  // Publish Tender (commits to database)
  async function handlePublish() {
    setIsPublishing(true)
    setPublishError(null)
    setPublishSuccess(null)

    let payload: PublishTenderRequest

    if (editorMode === "json") {
      try {
        payload = JSON.parse(rawJson)
      } catch (err: any) {
        setPublishError(`Invalid JSON: ${err.message}`)
        setIsPublishing(false)
        return
      }
    } else {
      if (!tenderRef.trim() || !title.trim()) {
        setPublishError("Tender Reference and Title are required.")
        setIsPublishing(false)
        return
      }
      payload = {
        department_name: departmentName,
        department_code: departmentCode,
        tender_ref: tenderRef,
        title: title,
        category: category,
        location: location,
        estimated_value: Number(estimatedValue) || 0,
        status: status,
        progress_stage: progressStage,
        closing_date: closingDate || undefined,
        bidders: bidders
          .filter((b) => b.company_name.trim().length > 0)
          .map(({ id, ...b }) => ({
            ...b,
            bid_amount: Number(b.bid_amount) || 0,
          })),
      }
    }

    try {
      const res = await publishTender(payload)
      const ref = res.tender?.tender_ref || payload.tender_ref
      setPublishSuccess(`Tender project "${ref}" successfully published to database with ${res.tender?.bidders_count || payload.bidders?.length || 0} bidders! Deterministic risk screening executed.`)
      
      // Refresh list and jump to manage view
      await fetchTendersList(ref)
      setActiveTab("manage")
    } catch (err: any) {
      setPublishError(err.message || "Failed to publish tender.")
    } finally {
      setIsPublishing(false)
    }
  }

  // Manage existing tender (update status/stage)
  async function handleUpdateManagement() {
    if (!selectedTenderRef) return
    setIsUpdatingStatus(true)
    setStatusUpdateMessage(null)
    try {
      const updatePayload: TenderManagementUpdate = {
        status: editStatus,
        progress_stage: editStage,
        run_risk_screening: true,
      }
      await manageTender(selectedTenderRef, updatePayload)
      await loadProjectStatus(selectedTenderRef)
      setStatusUpdateMessage("Project milestone & status updated successfully.")
      await fetchTendersList(selectedTenderRef)
    } catch (err: any) {
      setStatusUpdateMessage(`Error updating: ${err.message}`)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Add Bidder to Live Tender
  async function handleAddBidderSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTenderRef || !newBidderName.trim() || !newBidderAmount) return

    setIsSubmittingBidder(true)
    try {
      const payload: BidderInput = {
        company_name: newBidderName.trim(),
        bid_amount: Number(newBidderAmount),
        bid_status: newBidderStatus,
        registered_address: newBidderAddress.trim() || undefined,
        directors: newBidderDirectors
          ? newBidderDirectors.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      }
      await addTenderBidder(selectedTenderRef, payload)
      await loadProjectStatus(selectedTenderRef)
      setShowAddBidderModal(false)
      setNewBidderName("")
      setNewBidderAmount("")
      setNewBidderAddress("")
      setNewBidderDirectors("")
      setStatusUpdateMessage(`Bidder "${payload.company_name}" recorded & screened in real-time.`)
    } catch (err: any) {
      alert(`Failed to add bidder: ${err.message}`)
    } finally {
      setIsSubmittingBidder(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Workflow Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("manage")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              activeTab === "manage"
                ? "bg-accent text-background shadow-md shadow-accent/20"
                : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/10"
            )}
          >
            <Radio className="h-4 w-4" />
            Tender Project Manager
            {managedStatus && (
              <span className={cn(
                "ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold uppercase",
                managedStatus.is_live ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"
              )}>
                {managedStatus.is_live ? "Live" : managedStatus.status}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("publish")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              activeTab === "publish"
                ? "bg-accent text-background shadow-md shadow-accent/20"
                : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/10"
            )}
          >
            <Plus className="h-4 w-4" />
            Publish New Tender (Govt Form / JSON)
          </button>
        </div>

        {activeTab === "manage" && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Select Tender:</span>
            <select
              value={selectedTenderRef}
              onChange={(e) => {
                setSelectedTenderRef(e.target.value)
                loadProjectStatus(e.target.value)
              }}
              className="bg-zinc-900 border border-white/15 text-xs text-foreground rounded-lg px-3 py-1.5 focus:border-accent focus:outline-none max-w-xs font-mono"
            >
              {allTendersList.map((t) => (
                <option key={t.id || t.tender_ref} value={t.tender_ref}>
                  {t.tender_ref} — {t.title.length > 32 ? t.title.slice(0, 32) + "..." : t.title}
                </option>
              ))}
            </select>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => loadProjectStatus(selectedTenderRef)}
              disabled={isLoadingStatus}
              className="h-8 px-2.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-accent", isLoadingStatus && "animate-spin")} />
            </GlassButton>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: GOVERNMENT TENDER PROJECT MANAGEMENT DASHBOARD                     */}
      {/* ========================================================================= */}
      {activeTab === "manage" && (
        <div className="space-y-6">
          {isLoadingStatus && !managedStatus ? (
            <GlassCard level="panel" className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading government project dossier and live bidding telemetry...</p>
            </GlassCard>
          ) : managedStatus ? (
            <>
              {/* Project Headline & Live Telemetry Banner */}
              <GlassCard level="panel" className="p-6 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded border border-accent/20">
                        {managedStatus.tender_ref}
                      </span>

                      {/* Live Indicator Badge */}
                      {managedStatus.is_live ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          PROJECT LIVE · ACCEPTING BIDS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                          {managedStatus.status.toUpperCase()}
                        </span>
                      )}

                      <GlassBadge tone="default">{managedStatus.authority}</GlassBadge>
                    </div>

                    <h2 className="text-xl font-bold text-foreground tracking-tight">
                      {managedStatus.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5 text-accent" />
                        Estimated Budget:{" "}
                        <strong className="text-foreground">{formatCurrency(managedStatus.estimated_value)}</strong>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-accent" />
                        Active Bidders:{" "}
                        <strong className="text-foreground">{managedStatus.bidders.length} entities</strong>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-accent" />
                        Closing Date:{" "}
                        <strong className="text-foreground">{managedStatus.closing_date || "Open Indefinitely"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions & Links */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <GlassButton
                      variant="default"
                      size="sm"
                      onClick={() => setShowAddBidderModal(true)}
                      className="gap-1.5 bg-accent text-background font-semibold"
                    >
                      <Plus className="h-4 w-4" />
                      Add Bidder
                    </GlassButton>

                    <Link href={`/tenders/${encodeURIComponent(managedStatus.tender_ref)}`}>
                      <GlassButton variant="default" size="sm" className="gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Tender 360
                      </GlassButton>
                    </Link>
                  </div>
                </div>

                {/* Progress Bar & Milestone Stages */}
                <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-accent" />
                      Milestone Stage: <span className="text-accent">{managedStatus.progress_stage}</span>
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {managedStatus.progress_pct}% Completed
                    </span>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden border border-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        managedStatus.progress_pct >= 100
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : managedStatus.is_live
                          ? "bg-gradient-to-r from-accent to-emerald-400"
                          : "bg-gradient-to-r from-amber-500 to-accent"
                      )}
                      style={{ width: `${Math.max(5, managedStatus.progress_pct)}%` }}
                    />
                  </div>

                  {/* Visual Milestones Stepper */}
                  <div className="grid grid-cols-4 gap-2 pt-1 text-[11px] text-center">
                    <div className={cn(
                      "p-1.5 rounded border transition-colors",
                      managedStatus.progress_pct >= 20 ? "border-accent/40 bg-accent/10 text-foreground" : "border-white/5 text-muted-foreground opacity-50"
                    )}>
                      1. Dossier Drafted
                    </div>
                    <div className={cn(
                      "p-1.5 rounded border transition-colors",
                      managedStatus.progress_pct >= 40 ? "border-accent/40 bg-accent/10 text-foreground" : "border-white/5 text-muted-foreground opacity-50"
                    )}>
                      2. Live & Bidding Open
                    </div>
                    <div className={cn(
                      "p-1.5 rounded border transition-colors",
                      managedStatus.progress_pct >= 70 ? "border-accent/40 bg-accent/10 text-foreground" : "border-white/5 text-muted-foreground opacity-50"
                    )}>
                      3. Bid Evaluation
                    </div>
                    <div className={cn(
                      "p-1.5 rounded border transition-colors",
                      managedStatus.progress_pct >= 100 ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/5 text-muted-foreground opacity-50"
                    )}>
                      4. Contract Awarded
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Management Controls & Real-Time Risk Banner Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Government Operational Controls */}
                <GlassCard level="panel" className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Sliders className="h-4 w-4 text-accent" />
                      Manage Stage & Status
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-muted-foreground block mb-1">Operational Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                      >
                        <option value="Live">🟢 Live (Accepting Submissions)</option>
                        <option value="Open">🔵 Open (General Access)</option>
                        <option value="Under Review">🟡 Under Review / Evaluation</option>
                        <option value="Awarded">🏆 Awarded</option>
                        <option value="Closed">⚪ Closed / Terminated</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Milestone Stage</label>
                      <select
                        value={editStage}
                        onChange={(e) => setEditStage(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                      >
                        <option value="Dossier Drafted">Dossier Drafted (20%)</option>
                        <option value="Live & Accepting Bids">Live & Accepting Bids (40%)</option>
                        <option value="Technical Evaluation">Technical Evaluation (65%)</option>
                        <option value="Commercial Evaluation">Commercial Evaluation (80%)</option>
                        <option value="Contract Awarded">Contract Awarded (100%)</option>
                      </select>
                    </div>

                    <GlassButton
                      variant="default"
                      size="sm"
                      onClick={handleUpdateManagement}
                      disabled={isUpdatingStatus}
                      className="w-full mt-2"
                    >
                      {isUpdatingStatus ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Updating Project...
                        </>
                      ) : (
                        "Save Stage & Screen Risk"
                      )}
                    </GlassButton>

                    {statusUpdateMessage && (
                      <p className="text-[11px] text-accent pt-1 text-center font-medium">
                        {statusUpdateMessage}
                      </p>
                    )}
                  </div>
                </GlassCard>

                {/* Bidding Variance & Financial Metrics */}
                <GlassCard level="panel" className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-accent" />
                      Bid Pricing Analytics
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                      <span className="text-muted-foreground block text-[11px]">Mean Submitted Bid</span>
                      <span className="font-semibold text-foreground font-mono">
                        {managedStatus.bidding_summary?.mean_bid
                          ? formatCurrency(managedStatus.bidding_summary.mean_bid)
                          : "—"}
                      </span>
                    </div>

                    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                      <span className="text-muted-foreground block text-[11px]">Bid Spread</span>
                      <span className="font-semibold text-foreground font-mono">
                        {managedStatus.bidding_summary?.spread_pct !== undefined
                          ? `${managedStatus.bidding_summary.spread_pct.toFixed(2)}%`
                          : "—"}
                      </span>
                    </div>

                    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                      <span className="text-muted-foreground block text-[11px]">Lowest Bid</span>
                      <span className="font-semibold text-emerald-400 font-mono">
                        {managedStatus.bidding_summary?.min_bid
                          ? formatCurrency(managedStatus.bidding_summary.min_bid)
                          : "—"}
                      </span>
                    </div>

                    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                      <span className="text-muted-foreground block text-[11px]">Highest Bid</span>
                      <span className="font-semibold text-foreground font-mono">
                        {managedStatus.bidding_summary?.max_bid
                          ? formatCurrency(managedStatus.bidding_summary.max_bid)
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Coefficient of variation is{" "}
                    <strong className="text-foreground">
                      {managedStatus.bidding_summary?.cv_pct !== undefined
                        ? `${managedStatus.bidding_summary.cv_pct.toFixed(2)}%`
                        : "0%"}
                    </strong>
                    . Abnormally tight spreads (&lt;1%) are automatically flagged for cartel pattern review.
                  </p>
                </GlassCard>

                {/* Risk Intelligence Screen */}
                <GlassCard
                  level="panel"
                  className={cn(
                    "p-5 space-y-4 border transition-colors",
                    (managedStatus.risk_assessment?.risk_level || "").toLowerCase() === "critical"
                      ? "border-red-500/40 bg-red-500/[0.03]"
                      : (managedStatus.risk_assessment?.risk_level || "").toLowerCase() === "high"
                      ? "border-amber-500/40 bg-amber-500/[0.03]"
                      : "border-white/10"
                  )}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      {(managedStatus.risk_assessment?.risk_score ?? 0) > 60 ? (
                        <ShieldAlert className="h-4 w-4 text-red-400" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      )}
                      Risk Screening Status
                    </h3>
                    <GlassBadge
                      tone={
                        (managedStatus.risk_assessment?.risk_level || "").toLowerCase() === "critical"
                          ? "critical"
                          : (managedStatus.risk_assessment?.risk_level || "").toLowerCase() === "high"
                          ? "warning"
                          : "muted"
                      }
                    >
                      {(managedStatus.risk_assessment?.risk_level || "low").toUpperCase()} (
                      {managedStatus.risk_assessment?.risk_score ?? 0}/100)
                    </GlassBadge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Detected Signals:</span>
                      <strong className="text-foreground">
                        {managedStatus.risk_assessment?.signal_count ?? 0} signals
                      </strong>
                    </div>

                    {(managedStatus.risk_assessment?.flags && managedStatus.risk_assessment.flags.length > 0) ? (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-amber-300">Active Signals:</span>
                        {managedStatus.risk_assessment.flags.map((flag, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 text-[11px] text-amber-200/90 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"
                          >
                            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        No collusion flags detected at current threshold.
                      </div>
                    )}

                    <div className="pt-2 text-[11px] text-muted-foreground">
                      <strong>Recommendation:</strong>{" "}
                      {managedStatus.risk_assessment?.recommended_action || "Standard procurement monitoring."}
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Bidders & Amounts Detailed Breakdown Table */}
              <GlassCard level="panel" className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-accent" />
                      Participating Bidders & Quotation Amounts
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Real-time register of participating contractors, bid amounts, variance against estimated budget, and submission timestamps.
                    </p>
                  </div>

                  <GlassButton
                    variant="default"
                    size="sm"
                    onClick={() => setShowAddBidderModal(true)}
                    className="gap-1.5 text-xs self-start sm:self-auto"
                  >
                    <Plus className="h-3.5 w-3.5 text-accent" />
                    Record New Bidder
                  </GlassButton>
                </div>

                {managedStatus.bidders.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No bidders registered for this tender yet. Click "Record New Bidder" to add participating companies.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-muted-foreground">
                          <th className="pb-3 font-medium">Bidder / Company Name</th>
                          <th className="pb-3 font-medium">Quoted Amount</th>
                          <th className="pb-3 font-medium">Variance vs Budget</th>
                          <th className="pb-3 font-medium">Bid Status</th>
                          <th className="pb-3 font-medium">Submitted At</th>
                          <th className="pb-3 font-medium text-right">Inspect Entity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {managedStatus.bidders.map((b) => (
                          <tr key={b.id || b.company_id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 pr-3">
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-accent shrink-0" />
                                {b.company_name}
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground">{b.company_id}</span>
                            </td>

                            <td className="py-3 font-mono font-semibold text-foreground">
                              {formatCurrency(b.amount)}
                            </td>

                            <td className="py-3">
                              {b.variance_pct !== undefined && b.variance_pct !== null ? (
                                <span
                                  className={cn(
                                    "font-mono font-medium text-[11px] px-2 py-0.5 rounded",
                                    b.variance_pct < 0
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : b.variance_pct === 0
                                      ? "bg-zinc-500/10 text-zinc-300"
                                      : "bg-amber-500/10 text-amber-400"
                                  )}
                                >
                                  {b.variance_pct > 0 ? `+${b.variance_pct.toFixed(2)}%` : `${b.variance_pct.toFixed(2)}%`}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td className="py-3">
                              <GlassBadge
                                tone={
                                  b.status === "Awarded"
                                    ? "accent"
                                    : b.status === "Shortlisted"
                                    ? "default"
                                    : b.status === "Disqualified"
                                    ? "critical"
                                    : "muted"
                                }
                              >
                                {b.status}
                              </GlassBadge>
                            </td>

                            <td className="py-3 text-muted-foreground font-mono text-[11px]">
                              {b.submitted_at || "Just now"}
                            </td>

                            <td className="py-3 text-right">
                              <Link href={`/network?entity=${encodeURIComponent(b.company_name)}`}>
                                <GlassButton variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1">
                                  <span>Network</span>
                                  <ChevronRight className="h-3 w-3" />
                                </GlassButton>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </>
          ) : (
            <GlassCard level="panel" className="p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No tenders available in the system yet.</p>
              <GlassButton variant="default" size="sm" onClick={() => setActiveTab("publish")}>
                Publish First Tender Project
              </GlassButton>
            </GlassCard>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: PUBLISH NEW TENDER (GOVERNMENT FORM / DIRECT JSON)                 */}
      {/* ========================================================================= */}
      {activeTab === "publish" && (
        <div className="space-y-6">
          <GlassCard level="panel" className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Database className="h-4 w-4 text-accent" />
                  Government Tender Publishing Dossier
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Publish procurement tenders with full bidder allocations directly into the database. Choose between structured interactive form or raw JSON editor.
                </p>
              </div>

              {/* Mode Toggle: Form vs JSON */}
              <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleSwitchToForm}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors",
                    editorMode === "form" ? "bg-accent text-background font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Structured Form
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToJSON}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors",
                    editorMode === "json" ? "bg-accent text-background font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Code className="h-3.5 w-3.5" />
                  Direct JSON Editor
                </button>
              </div>
            </div>

            {/* Error & Success Alerts */}
            {jsonParseError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{jsonParseError}</span>
              </div>
            )}

            {publishError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{publishError}</span>
              </div>
            )}

            {publishSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{publishSuccess}</span>
              </div>
            )}

            {/* FORM MODE */}
            {editorMode === "form" ? (
              <div className="space-y-6 text-xs">
                {/* Section 1: Department & Tender Basic Metadata */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    1. Procuring Authority & Basic Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-muted-foreground block mb-1">Procuring Department</label>
                      <input
                        type="text"
                        value={departmentName}
                        onChange={(e) => setDepartmentName(e.target.value)}
                        placeholder="e.g. Ministry of Works"
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Department Code</label>
                      <input
                        type="text"
                        value={departmentCode}
                        onChange={(e) => setDepartmentCode(e.target.value)}
                        placeholder="e.g. MOW-CIVIL"
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">
                        Tender Reference ID <span className="text-accent">*</span>
                      </label>
                      <input
                        type="text"
                        value={tenderRef}
                        onChange={(e) => setTenderRef(e.target.value)}
                        placeholder="e.g. TDR-2026-HIGHWAY-01"
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground font-mono focus:border-accent focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                      >
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Education">Education</option>
                        <option value="Utilities">Utilities</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-muted-foreground block mb-1">
                        Tender Title <span className="text-accent">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Full official tender project title..."
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Location / Jurisdiction</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Capital Metropolitan Area"
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">
                        Estimated Contract Budget ($) <span className="text-accent">*</span>
                      </label>
                      <input
                        type="number"
                        value={estimatedValue}
                        onChange={(e) => setEstimatedValue(Number(e.target.value))}
                        placeholder="10000000"
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground font-mono focus:border-accent focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Project Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                      >
                        <option value="Live">🟢 Live (Active & Accepting Bids)</option>
                        <option value="Open">🔵 Open</option>
                        <option value="Under Review">🟡 Under Review</option>
                        <option value="Awarded">🏆 Awarded</option>
                        <option value="Closed">⚪ Closed</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Milestone Stage</label>
                      <select
                        value={progressStage}
                        onChange={(e) => setProgressStage(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                      >
                        <option value="Dossier Drafted">Dossier Drafted</option>
                        <option value="Live & Accepting Bids">Live & Accepting Bids</option>
                        <option value="Technical Evaluation">Technical Evaluation</option>
                        <option value="Commercial Evaluation">Commercial Evaluation</option>
                        <option value="Contract Awarded">Contract Awarded</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-muted-foreground block mb-1">Closing Submission Deadline</label>
                      <input
                        type="date"
                        value={closingDate}
                        onChange={(e) => setClosingDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Participating Bidders Allocation */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        2. Participating Bidders & Quotations ({bidders.length})
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Add the competing entities, their quoted amounts, registered addresses, and directors for collusion screening.
                      </p>
                    </div>

                    <GlassButton
                      variant="default"
                      size="sm"
                      onClick={handleAddBidderRow}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 text-accent" />
                      Add Bidder
                    </GlassButton>
                  </div>

                  <div className="space-y-3">
                    {bidders.map((bidder, index) => (
                      <div
                        key={bidder.id}
                        className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-accent" />
                            Bidder #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBidderRow(bidder.id)}
                            className="text-muted-foreground hover:text-red-400 p-1 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-muted-foreground block mb-1">Company Legal Name</label>
                            <input
                              type="text"
                              value={bidder.company_name}
                              onChange={(e) => handleBidderChange(bidder.id, "company_name", e.target.value)}
                              placeholder="e.g. Apex Construction Ltd"
                              className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-muted-foreground block mb-1">Bid Amount ($)</label>
                            <input
                              type="number"
                              value={bidder.bid_amount}
                              onChange={(e) => handleBidderChange(bidder.id, "bid_amount", Number(e.target.value))}
                              placeholder="12400000"
                              className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-1.5 text-foreground font-mono focus:border-accent focus:outline-none"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-muted-foreground block mb-1">Status</label>
                            <select
                              value={bidder.bid_status || "Submitted"}
                              onChange={(e) => handleBidderChange(bidder.id, "bid_status", e.target.value)}
                              className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
                            >
                              <option value="Submitted">Submitted</option>
                              <option value="Under Review">Under Review</option>
                              <option value="Shortlisted">Shortlisted</option>
                              <option value="Awarded">Awarded</option>
                              <option value="Disqualified">Disqualified</option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-muted-foreground block mb-1">Registered Address (for clustering)</label>
                            <input
                              type="text"
                              value={bidder.registered_address || ""}
                              onChange={(e) => handleBidderChange(bidder.id, "registered_address", e.target.value)}
                              placeholder="e.g. 108 Industrial Blvd, Sector 4"
                              className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-muted-foreground block mb-1">Directors (comma-separated)</label>
                            <input
                              type="text"
                              value={(bidder.directors || []).join(", ")}
                              onChange={(e) => handleBidderChange(bidder.id, "directors", e.target.value)}
                              placeholder="e.g. David Vance, Elena Rostova"
                              className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* RAW JSON MODE */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Enter or paste standard Government Tender JSON payload:</span>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(rawJson)
                        setRawJson(JSON.stringify(parsed, null, 2))
                        setJsonParseError(null)
                      } catch (err: any) {
                        setJsonParseError(err.message)
                      }
                    }}
                    className="text-accent hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Format JSON
                  </button>
                </div>

                <textarea
                  value={rawJson}
                  onChange={(e) => {
                    setRawJson(e.target.value)
                    setJsonParseError(null)
                  }}
                  rows={18}
                  className="w-full rounded-xl border border-white/15 bg-zinc-950 p-4 font-mono text-xs text-foreground focus:border-accent focus:outline-none leading-relaxed"
                />
              </div>
            )}

            {/* Publishing Submit Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="text-xs text-muted-foreground">
                Commitment will create tender records, normalize corporate entities, and execute deterministic collusion risk detection.
              </div>

              <GlassButton
                variant="default"
                size="md"
                onClick={handlePublish}
                disabled={isPublishing}
                className="gap-2 bg-accent text-background font-semibold"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Publishing to Database...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Publish Tender to Database
                  </>
                )}
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Add Bidder Modal */}
      {showAddBidderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <GlassCard level="panel" className="w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Record Bidder for Live Tender</h3>
                <span className="font-mono text-xs text-accent">{selectedTenderRef}</span>
              </div>
              <GlassButton variant="ghost" size="sm" onClick={() => setShowAddBidderModal(false)}>
                Cancel
              </GlassButton>
            </div>

            <form onSubmit={handleAddBidderSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  value={newBidderName}
                  onChange={(e) => setNewBidderName(e.target.value)}
                  placeholder="e.g. Orion Infrastructure Ltd"
                  className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1">Bid Amount ($) *</label>
                  <input
                    type="number"
                    value={newBidderAmount}
                    onChange={(e) => setNewBidderAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="12300000"
                    className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground font-mono focus:border-accent focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1">Bid Status</label>
                  <select
                    value={newBidderStatus}
                    onChange={(e) => setNewBidderStatus(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Disqualified">Disqualified</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Registered Address (Optional)</label>
                <input
                  type="text"
                  value={newBidderAddress}
                  onChange={(e) => setNewBidderAddress(e.target.value)}
                  placeholder="e.g. 108 Industrial Blvd, Sector 4"
                  className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Key Directors (Optional, comma-separated)</label>
                <input
                  type="text"
                  value={newBidderDirectors}
                  onChange={(e) => setNewBidderDirectors(e.target.value)}
                  placeholder="e.g. David Vance, Elena Rostova"
                  className="w-full bg-zinc-900 border border-white/15 rounded-lg px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <GlassButton type="button" variant="ghost" size="sm" onClick={() => setShowAddBidderModal(false)}>
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={isSubmittingBidder}
                  className="bg-accent text-background font-semibold"
                >
                  {isSubmittingBidder ? "Saving & Screening..." : "Confirm & Screen Bidder"}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
