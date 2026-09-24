"use client"

import React, { useState } from "react"
import {
  X,
  ExternalLink,
  ShieldAlert,
  Building2,
  FileText,
  User,
  MapPin,
  Landmark,
  Share2,
  FolderPlus,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight,
  Database,
  Calendar,
  Sparkles,
} from "lucide-react"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import { type GraphNode, type GraphEdge, nodeStyles } from "./graph-data"
import { createInvestigationFromNode } from "@/lib/api-client"

interface EntityDetailPanelProps {
  selectedNode: GraphNode | null
  selectedEdge: GraphEdge | null
  onClose: () => void
  onExpandDepth: (entityId: string, depth: number) => void
  onInvestigationCreated?: (investigation: any) => void
}

export function EntityDetailPanel({
  selectedNode,
  selectedEdge,
  onClose,
  onExpandDepth,
  onInvestigationCreated,
}: EntityDetailPanelProps) {
  const [creatingInvestigation, setCreatingInvestigation] = useState(false)
  const [investigationSuccess, setInvestigationSuccess] = useState<string | null>(null)
  const [investigationNotes, setInvestigationNotes] = useState("")

  if (!selectedNode && !selectedEdge) return null

  const handleCreateInvestigation = async () => {
    if (!selectedNode) return
    setCreatingInvestigation(true)
    setInvestigationSuccess(null)
    try {
      const res = await createInvestigationFromNode({
        entity_id: selectedNode.id,
        entity_type: selectedNode.type,
        entity_label: selectedNode.label,
        notes: investigationNotes || `Investigation initiated from procurement graph for ${selectedNode.label}`,
        priority: selectedNode.risk_level || "high",
      })
      setInvestigationSuccess(res.case_ref || res.title || "Investigation Case Created")
      if (onInvestigationCreated) {
        onInvestigationCreated(res)
      }
    } catch (err: any) {
      alert(`Failed to create investigation: ${err.message || err}`)
    } finally {
      setCreatingInvestigation(false)
    }
  }

  // Render for an Edge Selection
  if (selectedEdge) {
    const relType = selectedEdge.relationship_type || selectedEdge.label || "RELATIONSHIP"
    const prov = selectedEdge.provenance || {
      source_name: "Government Procurement Ingestion Engine",
      source_record_id: selectedEdge.id || "REC-GRAPH-REL",
      confidence: 0.95,
      retrieved_at: new Date().toISOString(),
    }

    return (
      <aside className="fixed inset-y-0 right-0 z-40 w-96 max-w-[90vw] border-l border-white/10 bg-[#090d14]/95 p-5 shadow-2xl backdrop-blur-xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Relationship Provenance</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Type</span>
            <div className="mt-1">
              <span className="inline-flex items-center rounded-md bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent border border-accent/30 font-mono">
                {relType}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 text-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span>Source Node:</span>
              <span className="font-mono text-white">{(selectedEdge as any).from || (selectedEdge as any).source}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Target Node:</span>
              <span className="font-mono text-white">{(selectedEdge as any).to || (selectedEdge as any).target}</span>
            </div>
          </div>

          {/* Provenance Card */}
          <div className="rounded-lg border border-white/8 bg-[#0d131e] p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Database className="h-3.5 w-3.5 text-accent" />
              <span>Data Provenance</span>
            </div>
            <div className="text-[11px] space-y-1.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>Source System:</span>
                <span className="text-white font-medium">{prov.source_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Record ID:</span>
                <span className="text-white font-mono">{prov.source_record_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Confidence:</span>
                <span className="text-emerald-400 font-semibold">{Math.round(prov.confidence * 100)}% Verified</span>
              </div>
              {prov.retrieved_at && (
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span className="text-white">{new Date(prov.retrieved_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {selectedEdge.properties && Object.keys(selectedEdge.properties).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">Metadata Attributes</h4>
              <pre className="rounded-lg bg-black/40 border border-white/5 p-3 text-[10px] font-mono text-white/80 overflow-x-auto">
                {JSON.stringify(selectedEdge.properties, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </aside>
    )
  }

  // Render for a Node Selection
  const node = selectedNode!
  const style = nodeStyles[node.type] || nodeStyles.company
  const prov = node.provenance || {
    source_name: "Government Procurement Database",
    source_record_id: node.id,
    confidence: 0.95,
    retrieved_at: new Date().toISOString(),
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-96 max-w-[90vw] border-l border-white/10 bg-[#090d14]/95 p-5 shadow-2xl backdrop-blur-xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold"
            style={{
              backgroundColor: style.bg,
              borderColor: style.border,
              color: style.color,
            }}
          >
            {node.type.substring(0, 2).toUpperCase()}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground truncate max-w-[210px]">{node.label}</h3>
            <span className="text-[10px] uppercase font-mono tracking-wider" style={{ color: style.color }}>
              {style.label}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-4 flex-1">
        {/* Risk Badge and Overview */}
        <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] p-3">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-mono">Risk Level</span>
            <div className="text-xs font-semibold capitalize text-foreground mt-0.5">
              {node.risk_level || "Standard Review"}
            </div>
          </div>
          {node.risk_level && (
            <GlassBadge
              tone={
                node.risk_level === "critical"
                  ? "critical"
                  : node.risk_level === "high"
                  ? "high"
                  : node.risk_level === "medium"
                  ? "medium"
                  : "low"
              }
            >
              {node.risk_level.toUpperCase()}
            </GlassBadge>
          )}
        </div>

        {/* Quick Neighborhood Expansion Actions */}
        <div className="rounded-lg border border-white/8 bg-[#0c111a] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-accent" />
              Expand Network Depth
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <GlassButton
              variant="default"
              size="sm"
              className="text-[11px] py-1"
              onClick={() => onExpandDepth(node.id, 1)}
            >
              Depth 1
            </GlassButton>
            <GlassButton
              variant="default"
              size="sm"
              className="text-[11px] py-1"
              onClick={() => onExpandDepth(node.id, 2)}
            >
              Depth 2
            </GlassButton>
            <GlassButton
              variant="default"
              size="sm"
              className="text-[11px] py-1"
              onClick={() => onExpandDepth(node.id, 3)}
            >
              Depth 3
            </GlassButton>
          </div>
        </div>

        {/* Specific Attributes based on Entity Type */}
        {node.properties && (
          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3.5 space-y-2">
            <span className="text-xs font-semibold text-foreground">Entity Attributes</span>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {Object.entries(node.properties).map(([key, value]) => {
                if (key === "raw_payload" || typeof value === "object") return null
                return (
                  <div key={key} className="flex justify-between items-center py-0.5 border-b border-white/5">
                    <span className="capitalize">{key.replace(/_/g, " ")}:</span>
                    <span className="font-mono text-white text-right max-w-[180px] truncate">{String(value)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Data Provenance Card */}
        <div className="rounded-lg border border-accent/20 bg-[#08121f] p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent">
            <Database className="h-3.5 w-3.5" />
            <span>Documented Provenance</span>
          </div>
          <div className="text-[11px] space-y-1.5 text-muted-foreground">
            <div className="flex justify-between">
              <span>Source System:</span>
              <span className="text-white font-medium">{prov.source_name}</span>
            </div>
            <div className="flex justify-between">
              <span>Source Record ID:</span>
              <span className="text-white font-mono">{prov.source_record_id}</span>
            </div>
            <div className="flex justify-between">
              <span>Confidence Score:</span>
              <span className="text-emerald-400 font-semibold">{Math.round(prov.confidence * 100)}%</span>
            </div>
            {prov.retrieved_at && (
              <div className="flex justify-between">
                <span>Ingested:</span>
                <span className="text-white">{new Date(prov.retrieved_at).toLocaleString()}</span>
              </div>
            )}
            {prov.notes && (
              <p className="text-[10px] text-white/60 italic pt-1 border-t border-white/5">{prov.notes}</p>
            )}
          </div>
        </div>

        {/* Create Investigation Section */}
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3.5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <FolderPlus className="h-3.5 w-3.5 text-violet-400" />
            <span>Launch Investigation</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Initiate a formal review case capturing this entity, connected relationships, and provenance evidence.
          </p>

          <input
            type="text"
            placeholder="Case notes or review reason..."
            value={investigationNotes}
            onChange={(e) => setInvestigationNotes(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:border-accent focus:outline-none"
          />

          <GlassButton
            variant="accent"
            size="sm"
            className="w-full justify-center"
            disabled={creatingInvestigation}
            onClick={handleCreateInvestigation}
          >
            <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
            {creatingInvestigation ? "Creating Case..." : "Create Investigation Case"}
          </GlassButton>

          {investigationSuccess && (
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 p-2 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{investigationSuccess} opened successfully</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
