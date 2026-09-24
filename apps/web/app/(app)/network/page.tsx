"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  RefreshCw,
  Maximize2,
  Minimize2,
  Share2,
  Database,
  Layers,
  Sparkles,
  AlertCircle,
  FileCheck2,
} from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassButton } from "@/components/glass/glass-button"
import { GlassBadge } from "@/components/glass/glass-badge"
import { ReactFlowGraph } from "@/components/network/react-flow-graph"
import { EntityDetailPanel } from "@/components/network/entity-detail-panel"
import { SignalsDock } from "@/components/network/signals-dock"
import { GraphToolbar } from "@/components/network/graph-toolbar"
import {
  getGlobalGraph,
  getEntityNeighbors,
  getTemporalGraph,
  getGraphSignals,
  type ApiGraphResponse,
  type EntitySearchResult,
  type GraphSignalOut,
} from "@/lib/api-client"
import { type GraphNode, type GraphEdge } from "@/components/network/graph-data"

export default function NetworkPage() {
  const [graphData, setGraphData] = useState<ApiGraphResponse | null>(null)
  const [signals, setSignals] = useState<GraphSignalOut[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Selection state
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null)
  const [highlightedEntityIds, setHighlightedEntityIds] = useState<Set<string>>(new Set())

  // Controls & Filters
  const [currentDepth, setCurrentDepth] = useState<number>(2)
  const [selectedNodeType, setSelectedNodeType] = useState<string>("all")
  const [selectedRelType, setSelectedRelType] = useState<string>("all")
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [activeRootEntityId, setActiveRootEntityId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // Success toast for created investigations
  const [investigationToast, setInvestigationToast] = useState<string | null>(null)

  // Load graph data based on root entity or global
  const loadGraph = useCallback(
    async (rootId: string | null = null, depth = 2, year = "all") => {
      setLoading(true)
      setError(null)
      try {
        let gData: ApiGraphResponse
        if (year !== "all") {
          const y = parseInt(year, 10)
          gData = await getTemporalGraph(y, y)
        } else if (rootId) {
          gData = await getEntityNeighbors(rootId, depth)
        } else {
          gData = await getGlobalGraph()
        }

        const sigData = await getGraphSignals(rootId || undefined)
        setGraphData(gData)
        setSignals(sigData)
      } catch (err: any) {
        console.error("Failed to load graph:", err)
        setError("Failed to load graph data. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadGraph(activeRootEntityId, currentDepth, selectedYear)
  }, [loadGraph, activeRootEntityId, currentDepth, selectedYear])

  // Expand entity depth
  const handleExpandDepth = (entityId: string, depth: number) => {
    setActiveRootEntityId(entityId)
    setCurrentDepth(depth)
    setSelectedYear("all")
  }

  // Handle entity search selection
  const handleSelectSearchResult = (result: EntitySearchResult) => {
    setActiveRootEntityId(result.id)
    setSelectedYear("all")
  }

  // Reset graph to global view
  const handleReset = () => {
    setActiveRootEntityId(null)
    setCurrentDepth(2)
    setSelectedNodeType("all")
    setSelectedRelType("all")
    setSelectedYear("all")
    setSelectedNode(null)
    setSelectedEdge(null)
    setHighlightedEntityIds(new Set())
  }

  // Export graph as JSON
  const handleExport = () => {
    if (!graphData) return
    const exportPayload = {
      exported_at: new Date().toISOString(),
      summary: graphData.summary,
      signals: signals,
      nodes: graphData.nodes,
      edges: graphData.edges,
    }
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cartelnet-graph-snapshot-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Highlight entities from signal click
  const handleSelectSignalEntities = (entityIds: string[]) => {
    setHighlightedEntityIds(new Set(entityIds))
    const firstMatch = graphData?.nodes.find((n) => entityIds.includes(n.id))
    if (firstMatch) {
      setSelectedNode(firstMatch)
      setSelectedEdge(null)
    }
  }

  // Filter nodes & edges on client-side
  const filteredNodes = useMemo(() => {
    if (!graphData?.nodes) return []
    let list = graphData.nodes

    if (selectedNodeType !== "all") {
      list = list.filter((n) => n.type === selectedNodeType)
    }

    if (highlightedEntityIds.size > 0) {
      list = list.map((n) => ({
        ...n,
        // Mark highlighting in properties
        properties: {
          ...n.properties,
          isSignalHighlighted: highlightedEntityIds.has(n.id),
        },
      }))
    }

    return list
  }, [graphData?.nodes, selectedNodeType, highlightedEntityIds])

  const filteredEdges = useMemo(() => {
    if (!graphData?.edges) return []
    let list = graphData.edges

    if (selectedRelType !== "all") {
      list = list.filter(
        (e) => (e.relationship_type || e.label || "") === selectedRelType
      )
    }

    return list
  }, [graphData?.edges, selectedRelType])

  const totalVisibleNodes = filteredNodes.length
  const totalVisibleEdges = filteredEdges.length

  return (
    <div className={`animate-fade-in space-y-5 ${isFullscreen ? "fixed inset-0 z-50 bg-[#06070a] p-6 overflow-y-auto" : ""}`}>
      {/* Header */}
      <PageHeader
        title="Procurement Graph Intelligence"
        subtitle="Explore real-world procurement relationship networks, documented directorships, registered facilities, and objective risk signals."
        actions={
          <div className="flex items-center gap-2">
            <GlassButton
              variant="default"
              size="md"
              onClick={() => loadGraph(activeRootEntityId, currentDepth, selectedYear)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </GlassButton>
            <GlassButton
              variant="default"
              size="icon"
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </GlassButton>
          </div>
        }
      />

      {/* Investigation Success Toast Banner */}
      {investigationToast && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4" />
            <span>{investigationToast}</span>
          </div>
          <button
            onClick={() => setInvestigationToast(null)}
            className="text-emerald-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Control & Filter Toolbar */}
      <GlassCard level="panel" className="p-4">
        <GraphToolbar
          currentDepth={currentDepth}
          onDepthChange={(d) => setCurrentDepth(d)}
          selectedNodeType={selectedNodeType}
          onNodeTypeChange={(t) => setSelectedNodeType(t)}
          selectedRelType={selectedRelType}
          onRelTypeChange={(r) => setSelectedRelType(r)}
          selectedYear={selectedYear}
          onYearChange={(y) => setSelectedYear(y)}
          onSelectSearchResult={handleSelectSearchResult}
          onReset={handleReset}
          onExport={handleExport}
        />
      </GlassCard>

      {/* Main Interactive Graph Viewport */}
      <GlassCard level="panel" className="relative overflow-hidden border-white/10 shadow-2xl">
        {/* Viewport Top Bar */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse"
              style={{ boxShadow: "0 0 10px var(--accent)" }}
            />
            <span className="text-sm font-semibold text-foreground">
              {activeRootEntityId
                ? `Ego Network for ${activeRootEntityId} (Depth ${currentDepth})`
                : selectedYear !== "all"
                ? `Procurement Network (${selectedYear})`
                : "Real Procurement Entity & Directorship Network"}
            </span>
            {activeRootEntityId && (
              <button
                onClick={handleReset}
                className="text-[11px] text-accent hover:underline ml-2"
              >
                (Reset to Global)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <GlassBadge tone="cyan">
              {totalVisibleNodes} Nodes · {totalVisibleEdges} Edges
            </GlassBadge>
            <GlassBadge tone="violet">
              NetworkX Engine Active
            </GlassBadge>
          </div>
        </div>

        {/* React Flow Container */}
        <div
          className="relative h-[620px] w-full"
          style={{
            background:
              "radial-gradient(80% 70% at 50% 50%, rgba(34,211,238,0.05), transparent 75%)",
          }}
        >
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-30">
              <RefreshCw className="h-8 w-8 text-accent animate-spin mb-2" />
              <p className="text-xs font-mono text-muted-foreground">Constructing NetworkX Subgraph...</p>
            </div>
          ) : (
            <ReactFlowGraph
              nodes={filteredNodes}
              edges={filteredEdges}
              selectedNodeId={selectedNode?.id}
              selectedEdgeId={selectedEdge?.id}
              onSelectNode={(node) => {
                setSelectedNode(node)
                setSelectedEdge(null)
              }}
              onSelectEdge={(edge) => {
                setSelectedEdge(edge)
                setSelectedNode(null)
              }}
            />
          )}

          {/* Side Drawer for Node / Edge Intelligence & Provenance */}
          <EntityDetailPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onClose={() => {
              setSelectedNode(null)
              setSelectedEdge(null)
            }}
            onExpandDepth={handleExpandDepth}
            onInvestigationCreated={(inv) => {
              setInvestigationToast(
                `Investigation ${inv.case_ref || inv.title} opened with attached provenance evidence.`
              )
            }}
          />
        </div>
      </GlassCard>

      {/* Topological Risk Signals Bottom Dock */}
      <SignalsDock
        signals={signals}
        onSelectSignalEntities={handleSelectSignalEntities}
        onCreateInvestigation={(sig) => {
          setInvestigationToast(
            `Initiated investigation review for signal: ${sig.title}`
          )
        }}
      />
    </div>
  )
}
