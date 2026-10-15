"use client"

import React, { useMemo } from "react"
import {
  Building2,
  FileText,
  User,
  MapPin,
  Landmark,
  Share2,
  AlertTriangle,
  Zap,
  Info,
  ShieldAlert,
} from "lucide-react"
import { type GraphNode, type GraphEdge } from "./graph-data"

export interface HoverTarget {
  type: "node" | "edge"
  node?: GraphNode | null
  edge?: GraphEdge | null
  clientX: number
  clientY: number
}

interface HoverFlashCardProps {
  hover: HoverTarget | null
  allNodes: GraphNode[]
  allEdges: GraphEdge[]
  containerRect?: DOMRect | null
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  company: Building2,
  tender: FileText,
  director: User,
  address: MapPin,
  authority: Landmark,
  default: Share2,
}

export function HoverFlashCard({
  hover,
  allNodes,
  allEdges,
  containerRect,
}: HoverFlashCardProps) {
  if (!hover) return null

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>()
    allNodes.forEach((n) => map.set(n.id, n))
    return map
  }, [allNodes])

  // Compute smart positioning relative to container or window
  const position = useMemo(() => {
    let x = hover.clientX + 16
    let y = hover.clientY + 16

    // If container rect provided, adjust relative to container
    if (containerRect) {
      const relX = hover.clientX - containerRect.left + 16
      const relY = hover.clientY - containerRect.top + 16

      // Clamp right edge (card width ~300px)
      const maxX = containerRect.width - 320
      const clampedX = relX > maxX ? Math.max(10, relX - 330) : relX

      // Clamp bottom edge (card height ~220px)
      const maxY = containerRect.height - 230
      const clampedY = relY > maxY ? Math.max(10, relY - 220) : relY

      return { left: clampedX, top: clampedY }
    }

    return { left: x, top: y }
  }, [hover.clientX, hover.clientY, containerRect])

  // When hovering a node
  if (hover.type === "node" && hover.node) {
    const node = hover.node
    const entityType = node.type || "company"
    const Icon = TYPE_ICONS[entityType] || TYPE_ICONS.default

    // Find connected edges and neighbors
    const connectedEdges = allEdges.filter((e) => {
      const from = (e as any).from || (e as any).source
      const to = (e as any).to || (e as any).target
      return from === node.id || to === node.id
    })

    const connectedNeighbors = connectedEdges.map((e) => {
      const from = (e as any).from || (e as any).source
      const to = (e as any).to || (e as any).target
      const neighborId = from === node.id ? to : from
      const neighbor = nodeMap.get(neighborId)
      const rel = e.relationship_type || e.label || "CONNECTED"
      return {
        id: neighborId,
        label: neighbor?.label || neighborId,
        type: neighbor?.type || "entity",
        rel,
      }
    })

    // Compute "Importance in very short"
    let importanceText = "Procurement entity monitored for integrity risk."
    let importanceTone: "critical" | "high" | "medium" | "low" | "cyan" = "cyan"
    let connectionSummary = `${connectedNeighbors.length} connection${connectedNeighbors.length === 1 ? "" : "s"}`

    const hasSharedDirector = connectedEdges.some(
      (e) => (e.relationship_type || e.label) === "SHARED_DIRECTOR"
    )
    const hasSharedAddress = connectedEdges.some(
      (e) => (e.relationship_type || e.label) === "SHARED_ADDRESS"
    )

    if (entityType === "company") {
      if (hasSharedDirector) {
        importanceText = "Shared directorship with rival bidder; eliminates independent pricing independence."
        importanceTone = "critical"
        connectionSummary = "Direct board linkage to competing contractor"
      } else if (hasSharedAddress) {
        importanceText = "Co-located registered address; indicates common operational control."
        importanceTone = "high"
        connectionSummary = "Shared premises with competing entities"
      } else if (node.risk_level === "critical" || node.risk_level === "high") {
        importanceText = "Elevated risk cluster; exhibits coordinated bidding patterns across tenders."
        importanceTone = "high"
      } else {
        importanceText = "Active bidder monitored for bilateral coordination and cover bidding."
        importanceTone = "cyan"
      }
    } else if (entityType === "director") {
      const linkedCompanies = connectedNeighbors.filter((n) => n.type === "company")
      if (linkedCompanies.length >= 2) {
        importanceText = `Interlocking director across ${linkedCompanies.length} rival firms; primary cartel nexus.`
        importanceTone = "critical"
        connectionSummary = `Holds board seats in: ${linkedCompanies.map((c) => c.label).slice(0, 2).join(", ")}`
      } else {
        importanceText = "Executive officer mapped for corporate ownership and conflict screening."
        importanceTone = "medium"
      }
    } else if (entityType === "address") {
      const linkedCompanies = connectedNeighbors.filter((n) => n.type === "company")
      if (linkedCompanies.length >= 2) {
        importanceText = `Shell/co-location risk: ${linkedCompanies.length} competing contractors registered at identical location.`
        importanceTone = "high"
        connectionSummary = `Shared by ${linkedCompanies.length} companies`
      } else {
        importanceText = "Registered corporate address cross-referenced for physical validation."
        importanceTone = "low"
      }
    } else if (entityType === "tender") {
      if (node.risk_level === "critical" || node.risk_level === "high") {
        importanceText = "Suspicious price clustering (CV < 1%) & structural bidder ties detected."
        importanceTone = "critical"
        connectionSummary = `${connectedNeighbors.length} participating bidders screened`
      } else {
        importanceText = "Procurement contract undergoing continuous automated risk screening."
        importanceTone = "low"
      }
    }

    const toneColorMap = {
      critical: "border-red-500/40 text-red-400 bg-red-500/10",
      high: "border-amber-500/40 text-amber-400 bg-amber-500/10",
      medium: "border-yellow-500/40 text-yellow-300 bg-yellow-500/10",
      low: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
      cyan: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
    }

    return (
      <div
        className="pointer-events-none absolute z-50 w-72 rounded-xl border border-white/15 bg-slate-950/75 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-75 animate-in fade-in zoom-in-95"
        style={{
          left: `${position.left}px`,
          top: `${position.top}px`,
        }}
      >
        {/* Header: Type + Risk Badge */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/10 text-white">
              <Icon className="h-3 w-3" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">
              {entityType}
            </span>
          </div>

          {node.risk_level ? (
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                toneColorMap[node.risk_level] || toneColorMap.cyan
              }`}
            >
              {node.risk_level} {node.risk_score ? `(${node.risk_score})` : ""}
            </span>
          ) : (
            <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-muted-foreground">
              Node
            </span>
          )}
        </div>

        {/* Node Label / Title */}
        <div className="mt-2">
          <h4 className="text-xs font-semibold text-white leading-snug line-clamp-2">
            {node.label}
          </h4>
          {node.properties?.tax_id && (
            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
              ID: {node.properties.tax_id}
            </div>
          )}
        </div>

        {/* Connection Details in very short */}
        <div className="mt-2.5 rounded-lg border border-white/8 bg-white/[0.03] p-2 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/90">
            <Share2 className="h-3 w-3 text-accent shrink-0" />
            <span className="truncate">{connectionSummary}</span>
          </div>

          {connectedNeighbors.slice(0, 2).map((n, idx) => (
            <div key={idx} className="flex items-center gap-1 text-[9.5px] text-muted-foreground truncate pl-4">
              <span className="text-accent/80 font-mono text-[9px] shrink-0">{n.rel.toLowerCase().replace("_", " ")} →</span>
              <span className="text-white/80 truncate">{n.label}</span>
            </div>
          ))}
          {connectedNeighbors.length > 2 && (
            <div className="text-[9px] text-muted-foreground/80 pl-4">
              +{connectedNeighbors.length - 2} more linked entities
            </div>
          )}
        </div>

        {/* Importance in very short */}
        <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-accent/20 bg-accent/[0.04] p-2">
          <Zap className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
          <div className="text-[10.5px] text-white/90 leading-tight">
            <span className="font-semibold text-accent block text-[9.5px] uppercase tracking-wider mb-0.5">
              Why it matters
            </span>
            {importanceText}
          </div>
        </div>
      </div>
    )
  }

  // When hovering an edge
  if (hover.type === "edge" && hover.edge) {
    const edge = hover.edge
    const fromId = (edge as any).from || (edge as any).source
    const toId = (edge as any).to || (edge as any).target
    const fromNode = nodeMap.get(fromId)
    const toNode = nodeMap.get(toId)

    const relType = edge.relationship_type || edge.label || "CONNECTED"

    let importance = "Relational connection between procurement entities."
    let edgeTone = "text-accent"

    if (relType === "SHARED_DIRECTOR") {
      importance = "Direct governance linkage between rival bidders in the same market."
      edgeTone = "text-red-400"
    } else if (relType === "SHARED_ADDRESS") {
      importance = "Physical co-location nexus; indicates non-arm's-length coordination."
      edgeTone = "text-amber-400"
    } else if (relType === "WON") {
      importance = "Contract award recipient for public procurement tender."
      edgeTone = "text-emerald-400"
    } else if (relType === "SUBMITTED_BID") {
      importance = "Bidding proposal submitted; analyzed for price variance clustering."
      edgeTone = "text-cyan-400"
    }

    return (
      <div
        className="pointer-events-none absolute z-50 w-72 rounded-xl border border-white/15 bg-slate-950/75 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-75 animate-in fade-in zoom-in-95"
        style={{
          left: `${position.left}px`,
          top: `${position.top}px`,
        }}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Share2 className="h-3 w-3 text-accent" />
            Relationship Edge
          </span>
          <span className={`text-[10px] font-bold font-mono uppercase ${edgeTone}`}>
            {relType.replace("_", " ")}
          </span>
        </div>

        {/* Source & Target Nodes */}
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[10px] text-muted-foreground uppercase shrink-0">From:</span>
            <span className="font-semibold text-white truncate">{fromNode?.label || fromId}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[10px] text-muted-foreground uppercase shrink-0">To:</span>
            <span className="font-semibold text-white truncate">{toNode?.label || toId}</span>
          </div>
        </div>

        {/* Importance in very short */}
        <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-accent/20 bg-accent/[0.04] p-2">
          <Zap className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
          <div className="text-[10.5px] text-white/90 leading-tight">
            <span className="font-semibold text-accent block text-[9.5px] uppercase tracking-wider mb-0.5">
              Why it matters
            </span>
            {importance}
          </div>
        </div>
      </div>
    )
  }

  return null
}
