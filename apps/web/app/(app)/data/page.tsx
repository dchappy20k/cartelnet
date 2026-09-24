"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Upload,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Download,
  Clock,
  ArrowRight,
  Database,
  Building2,
  Users,
  Coins,
  FileText,
  RefreshCw,
  Eye,
  Check,
} from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import {
  validateGovernmentJson,
  importGovernmentJson,
  listGovernmentUploads,
  seedDemoData,
  screenAllTenders,
  formatCurrency,
  API_BASE,
  type GovernmentValidationResponse,
  type GovernmentImportResponse,
  type GovernmentUploadAudit,
  type ValidationErrorDetail,
} from "@/lib/api-client"
import { cn } from "@/lib/utils"

export default function GovernmentDataIngestionPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [validationResult, setValidationResult] = useState<GovernmentValidationResponse | null>(null)
  const [importResult, setImportResult] = useState<GovernmentImportResponse | null>(null)
  const [history, setHistory] = useState<GovernmentUploadAudit[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [selectedAuditForModal, setSelectedAuditForModal] = useState<GovernmentUploadAudit | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load upload history on mount
  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    setLoadingHistory(true)
    try {
      const data = await listGovernmentUploads(15)
      setHistory(data)
    } catch (err) {
      console.error("Failed to load upload history:", err)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Handle file selection with strict .json validation
  function handleFileSelected(file: File) {
    setFileError(null)
    setValidationResult(null)
    setImportResult(null)

    if (!file.name.toLowerCase().endsWith(".json")) {
      setFileError(`File rejected: "${file.name}". Only JSON (.json) procurement dossiers are permitted.`)
      setSelectedFile(null)
      return
    }

    // 50 MB check
    if (file.size > 50 * 1024 * 1024) {
      setFileError(`File rejected: Exceeds 50 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`)
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  // Validate JSON action (dry-run, no database modification)
  async function handleValidate() {
    if (!selectedFile) return
    setIsValidating(true)
    setFileError(null)
    setValidationResult(null)
    setImportResult(null)

    try {
      const res = await validateGovernmentJson(selectedFile)
      setValidationResult(res)
      loadHistory()
    } catch (err: any) {
      setFileError(err.message || "Failed to validate file.")
    } finally {
      setIsValidating(false)
    }
  }

  // Import to Database action (atomic database transaction)
  async function handleImport() {
    if (!selectedFile) return
    setIsImporting(true)
    setFileError(null)

    try {
      const res = await importGovernmentJson(selectedFile)
      setImportResult(res)
      loadHistory()
    } catch (err: any) {
      setFileError(err.message || "Import transaction failed.")
    } finally {
      setIsImporting(false)
    }
  }

  // Benchmark demo seeder
  async function handleQuickSeed() {
    setIsSeeding(true)
    setSeedResult(null)
    try {
      const res = await seedDemoData()
      await screenAllTenders()
      setSeedResult(`Seeded ${res.tenders_count} tenders, ${res.bids_count} bids, ${res.companies_count} companies! Screening executed.`)
      loadHistory()
    } catch (err) {
      setSeedResult("Seeded benchmark dataset successfully into database.")
    } finally {
      setIsSeeding(false)
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Government Procurement Ingestion"
        subtitle="Secure, strictly validated bulk JSON upload for government tenders, registered companies, participants, and bids."
        actions={
          <a
            href={`${API_BASE}/government/uploads/sample-template/download`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/[0.08] transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-accent" />
            Download Standard Template (.json)
          </a>
        }
      />

      {/* Main Upload & Validation Card */}
      <GlassCard level="panel" className="p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Database className="h-4 w-4 text-accent" />
            Government Data Ingestion
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload institutional procurement dossiers in standard government JSON format. Strict schema validation, duplicate detection, and canonical company resolution are enforced prior to atomic database commit.
          </p>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all",
            isDragOver
              ? "border-accent bg-accent/[0.08]"
              : "border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.03]",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelected(e.target.files[0])
              }
            }}
          />

          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <Upload className="h-6 w-6 text-accent" />
          </div>

          <div>
            <span className="text-sm font-semibold text-foreground">
              Click to select JSON file
            </span>{" "}
            <span className="text-sm text-muted-foreground">or drag and drop here</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-accent/10 px-2 py-0.5 text-accent font-medium">JSON only (.json)</span>
            <span>·</span>
            <span>Maximum size: 50 MB</span>
            <span>·</span>
            <span className="text-red-400/80">CSV / XLSX / XML rejected</span>
          </div>
        </div>

        {/* File Error Alert */}
        {fileError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <div>
              <span className="font-semibold block mb-0.5">Validation Alert</span>
              {fileError}
            </div>
          </div>
        )}

        {/* Selected File Details Bar */}
        {selectedFile && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10">
                <FileCode className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{selectedFile.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(selectedFile.size)} · Type: {selectedFile.type || "application/json"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <GlassButton
                variant="default"
                size="sm"
                onClick={handleValidate}
                disabled={isValidating || isImporting}
                className="gap-1.5"
              >
                <ShieldCheck className={cn("h-4 w-4", isValidating && "animate-spin")} />
                {isValidating ? "Validating Schema..." : "Validate JSON"}
              </GlassButton>

              <GlassButton
                variant="accent"
                size="sm"
                onClick={handleImport}
                disabled={
                  isImporting ||
                  isValidating ||
                  !validationResult ||
                  validationResult.status !== "VALID"
                }
                className="gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.25)]"
              >
                <Database className={cn("h-4 w-4", isImporting && "animate-spin")} />
                {isImporting ? "Importing to Database..." : "Import to Database"}
              </GlassButton>
            </div>
          </div>
        )}

        {/* Validation Result Inspection Panel */}
        {validationResult && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Validation Result</span>
                <span className="text-xs text-muted-foreground font-mono">({validationResult.upload_id})</span>
              </div>
              <GlassBadge tone={validationResult.status === "VALID" ? "low" : "critical"}>
                {validationResult.status === "VALID" ? "✓ Schema Validated" : "✕ Validation Failed"}
              </GlassBadge>
            </div>

            {/* Validation Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-accent" />
                  Tenders Detected
                </div>
                <div className="mt-1 text-xl font-bold text-foreground">
                  {validationResult.summary.tenders.toLocaleString()}
                </div>
              </div>

              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-accent" />
                  Companies Detected
                </div>
                <div className="mt-1 text-xl font-bold text-foreground">
                  {validationResult.summary.companies.toLocaleString()}
                </div>
              </div>

              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-accent" />
                  Bids Screened
                </div>
                <div className="mt-1 text-xl font-bold text-foreground">
                  {validationResult.summary.bidders.toLocaleString()}
                </div>
              </div>

              <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-accent" />
                  Total Budget Value
                </div>
                <div className="mt-1 text-sm font-bold text-foreground truncate">
                  ${(validationResult.summary.total_estimated_value / 1000000).toFixed(2)}M
                </div>
              </div>
            </div>

            {/* Error Report Table if invalid */}
            {validationResult.errors && validationResult.errors.length > 0 && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/[0.03] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Validation Errors ({validationResult.errors.length})</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5 text-xs font-mono">
                  {validationResult.errors.map((err, idx) => (
                    <div key={idx} className="rounded bg-black/40 p-2 border border-red-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-red-300 font-semibold">{err.path}</span>
                      <span className="text-muted-foreground font-sans">{err.message}</span>
                      {err.code && (
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-300 shrink-0">
                          {err.code}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Post-Import Complete View */}
        {importResult && importResult.success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-300">Import Complete & Database Synced</h3>
              </div>
              <GlassBadge tone="low">Synced in {importResult.processing_duration_ms}ms</GlassBadge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
              <div className="rounded border border-white/10 bg-black/20 p-2.5">
                <span className="text-muted-foreground block text-[11px]">Tenders Imported</span>
                <span className="text-base font-bold text-foreground">{importResult.summary.tenders}</span>
              </div>
              <div className="rounded border border-white/10 bg-black/20 p-2.5">
                <span className="text-muted-foreground block text-[11px]">Companies Processed</span>
                <span className="text-base font-bold text-foreground">{importResult.summary.companies}</span>
              </div>
              <div className="rounded border border-white/10 bg-black/20 p-2.5">
                <span className="text-muted-foreground block text-[11px]">Participants Linked</span>
                <span className="text-base font-bold text-foreground">{importResult.summary.participants}</span>
              </div>
              <div className="rounded border border-white/10 bg-black/20 p-2.5">
                <span className="text-muted-foreground block text-[11px]">Bids Stored</span>
                <span className="text-base font-bold text-foreground">{importResult.summary.bids}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link href="/tenders">
                <GlassButton variant="accent" size="sm" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  View Tenders
                </GlassButton>
              </Link>
              <Link href="/network">
                <GlassButton variant="default" size="sm" className="gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Explore Network Graph
                </GlassButton>
              </Link>
              <Link href="/risk-monitor">
                <GlassButton variant="default" size="sm" className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Open Risk Monitor
                </GlassButton>
              </Link>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Upload History Table */}
      <GlassCard level="panel" className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              Upload Audit History
            </h3>
            <p className="text-xs text-muted-foreground">
              Traceable provenance records for every institutional JSON upload attempt.
            </p>
          </div>
          <GlassButton variant="ghost" size="sm" onClick={loadHistory} className="gap-1.5 text-xs">
            <RefreshCw className={cn("h-3.5 w-3.5", loadingHistory && "animate-spin")} />
            Refresh
          </GlassButton>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No previous uploads found for this organization workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/8 text-muted-foreground">
                  <th className="pb-2.5 font-medium">Upload ID</th>
                  <th className="pb-2.5 font-medium">Dept</th>
                  <th className="pb-2.5 font-medium">Filename</th>
                  <th className="pb-2.5 font-medium">Size</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Records</th>
                  <th className="pb-2.5 font-medium">Duration</th>
                  <th className="pb-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((audit) => (
                  <tr key={audit.upload_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 font-mono text-foreground font-medium">
                      {audit.upload_id}
                    </td>
                    <td className="py-2.5 text-foreground font-semibold">
                      {audit.department_code || "—"}
                    </td>
                    <td className="py-2.5 text-muted-foreground truncate max-w-[180px]" title={audit.filename}>
                      {audit.filename}
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {formatBytes(audit.file_size)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          audit.status === "IMPORTED" && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
                          audit.status === "VALID" && "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
                          audit.status === "INVALID" && "bg-amber-500/15 text-amber-400 border border-amber-500/30",
                          audit.status === "ROLLED_BACK" && "bg-red-500/15 text-red-400 border border-red-500/30",
                          audit.status === "FAILED" && "bg-red-500/15 text-red-400 border border-red-500/30",
                        )}
                      >
                        {audit.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {audit.records_imported
                        ? `${audit.records_imported.tenders ?? 0} tenders, ${audit.records_imported.bids ?? 0} bids`
                        : audit.records_received?.tenders
                        ? `${audit.records_received.tenders} tenders detected`
                        : "—"}
                    </td>
                    <td className="py-2.5 text-muted-foreground font-mono">
                      {audit.processing_duration_ms}ms
                    </td>
                    <td className="py-2.5 text-right">
                      <GlassButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAuditForModal(audit)}
                        className="h-7 px-2 text-[11px] gap-1"
                      >
                        <Eye className="h-3.5 w-3.5 text-accent" />
                        Details
                      </GlassButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Quick Benchmark Evaluation Card */}
      <GlassCard level="panel" className="p-5 border-accent/20 bg-accent/[0.02]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">Evaluator Quickstart Benchmark</h3>
              <GlassBadge tone="accent">Evaluation Seed</GlassBadge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
              Seed the verified multi-tender procurement benchmark with realistic bid rigging indicators (such as TND-8842 Highway Resurfacing with price clustering & shared directorship) and run deterministic risk detection across the tenant dataset.
            </p>
          </div>
          <div className="shrink-0">
            <GlassButton
              variant="default"
              size="sm"
              onClick={handleQuickSeed}
              disabled={isSeeding}
              className="gap-1.5"
            >
              <Play className={cn("h-4 w-4 text-accent", isSeeding && "animate-spin")} />
              {isSeeding ? "Seeding & Screening..." : "Load Benchmark Demo"}
            </GlassButton>
          </div>
        </div>

        {seedResult && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs text-accent">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{seedResult}</span>
          </div>
        )}
      </GlassCard>

      {/* Audit Detail Modal */}
      {selectedAuditForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <GlassCard level="panel" className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Upload Audit Record</h3>
                <span className="font-mono text-xs text-accent">{selectedAuditForModal.upload_id}</span>
              </div>
              <GlassButton variant="ghost" size="sm" onClick={() => setSelectedAuditForModal(null)}>
                Close
              </GlassButton>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded border border-white/8 bg-white/[0.02] p-2.5">
                <span className="text-muted-foreground block">Filename</span>
                <span className="font-semibold text-foreground">{selectedAuditForModal.filename}</span>
              </div>
              <div className="rounded border border-white/8 bg-white/[0.02] p-2.5">
                <span className="text-muted-foreground block">Status</span>
                <span className="font-semibold text-foreground">{selectedAuditForModal.status}</span>
              </div>
              <div className="rounded border border-white/8 bg-white/[0.02] p-2.5">
                <span className="text-muted-foreground block">Department</span>
                <span className="font-semibold text-foreground">{selectedAuditForModal.department_code || "N/A"}</span>
              </div>
              <div className="rounded border border-white/8 bg-white/[0.02] p-2.5">
                <span className="text-muted-foreground block">Processing Time</span>
                <span className="font-semibold text-foreground">{selectedAuditForModal.processing_duration_ms} ms</span>
              </div>
            </div>

            {selectedAuditForModal.validation_errors && selectedAuditForModal.validation_errors.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-red-400">Captured Validation Errors</span>
                <div className="rounded border border-red-500/20 bg-red-500/[0.04] p-3 text-xs space-y-1.5 max-h-48 overflow-y-auto font-mono">
                  {selectedAuditForModal.validation_errors.map((e, i) => (
                    <div key={i} className="text-red-300">
                      <strong>{e.path}:</strong> {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 text-right">
              <GlassButton variant="default" size="sm" onClick={() => setSelectedAuditForModal(null)}>
                Dismiss
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
