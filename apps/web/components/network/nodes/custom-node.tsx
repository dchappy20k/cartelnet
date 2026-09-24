"use client"

import React, { memo } from "react"
import { Handle, Position, NodeProps } from "@xyflow/react"
import {
  Building2,
  FileText,
  User,
  MapPin,
  Landmark,
  DollarSign,
  AlertTriangle,
  FolderGit2,
  ShieldAlert,
} from "lucide-react"
import { nodeStyles, type NodeType } from "../graph-data"

const TYPE_ICONS: Record<string, React.ElementType> = {
  company: Building2,
  tender: FileText,
  director: User,
  address: MapPin,
  authority: Landmark,
  bid: DollarSign,
  subcontractor: FolderGit2,
  investigation: AlertTriangle,
  default: ShieldAlert,
}

export interface CustomNodeData {
  id: string
  label: string
  type: NodeType
  risk_level?: "low" | "medium" | "high" | "critical"
  risk_score?: number
  degree?: number
  properties?: Record<string, any>
  provenance?: {
    source_name: string
    source_record_id: string
    confidence: number
  }
  isHighlighted?: boolean
  isSelected?: boolean
}

export const CustomNode = memo(({ data, selected }: NodeProps<any>) => {
  const nodeData: CustomNodeData = data
  const entityType = nodeData.type || "company"
  const style = nodeStyles[entityType] || nodeStyles.company
  const Icon = TYPE_ICONS[entityType] || TYPE_ICONS.default

  const riskColorMap = {
    critical: "bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_8px_rgba(244,63,94,0.4)]",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_8px_rgba(251,146,60,0.4)]",
    medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-[0_0_8px_rgba(251,191,36,0.3)]",
    low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  }

  const riskBadge = nodeData.risk_level ? riskColorMap[nodeData.risk_level] : null

  return (
    <div
      className={`group relative rounded-xl border backdrop-blur-md px-3.5 py-2.5 min-w-[170px] max-w-[260px] transition-all duration-200 ${
        selected || nodeData.isSelected
          ? "border-accent ring-2 ring-accent/50 shadow-[0_0_20px_rgba(34,211,238,0.35)] scale-105"
          : nodeData.isHighlighted
          ? "border-violet-400/80 ring-1 ring-violet-400/40 shadow-[0_0_15px_rgba(139,124,246,0.3)]"
          : "border-white/10 bg-[#0c1017]/85 hover:border-white/25 hover:bg-[#121824]/90 shadow-lg"
      }`}
      style={{
        borderLeftWidth: "4px",
        borderLeftColor: style.color,
      }}
    >
      {/* Target/Source Connection Handles on all 4 cardinal points */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-white/40 !border-none group-hover:!bg-accent transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-white/40 !border-none group-hover:!bg-accent transition-colors"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-white/40 !border-none group-hover:!bg-accent transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-white/40 !border-none group-hover:!bg-accent transition-colors"
      />

      <div className="flex items-start gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-white transition-transform group-hover:scale-110"
          style={{
            backgroundColor: style.bg,
            borderColor: style.border,
            color: style.color,
          }}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: style.color }}
            >
              {style.label}
            </span>
            {riskBadge && (
              <span className={`inline-flex items-center rounded-full border px-1.5 py-0.2 text-[9px] font-bold uppercase ${riskBadge}`}>
                {nodeData.risk_level}
              </span>
            )}
          </div>

          <h4 className="text-xs font-semibold text-foreground truncate leading-tight" title={nodeData.label}>
            {nodeData.label}
          </h4>

          {nodeData.properties?.tax_id && (
            <p className="text-[10px] font-mono text-muted-foreground truncate">
              ID: {nodeData.properties.tax_id}
            </p>
          )}

          {nodeData.properties?.tender_id && (
            <p className="text-[10px] font-mono text-muted-foreground truncate">
              Ref: {nodeData.properties.tender_id}
            </p>
          )}

          {nodeData.properties?.role && (
            <p className="text-[10px] text-muted-foreground truncate">
              Role: {nodeData.properties.role}
            </p>
          )}

          {nodeData.properties?.city && (
            <p className="text-[10px] text-muted-foreground truncate">
              Loc: {nodeData.properties.city}, {nodeData.properties.state || ""}
            </p>
          )}

          {nodeData.provenance && (
            <div className="mt-1 flex items-center gap-1 text-[9px] text-white/40">
              <span className="truncate">Src: {nodeData.provenance.source_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

CustomNode.displayName = "CustomNode"
