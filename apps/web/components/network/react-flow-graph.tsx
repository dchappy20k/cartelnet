"use client"

import React, { useMemo, useEffect, useCallback, useState, useRef } from "react"
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { CustomNode } from "./nodes/custom-node"
import { type GraphNode, type GraphEdge } from "./graph-data"
import { HoverFlashCard, type HoverTarget } from "./hover-flash-card"

const nodeTypes = {
  custom: CustomNode as any,
}

interface ReactFlowGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId?: string | null
  selectedEdgeId?: string | null
  onSelectNode: (node: GraphNode | null) => void
  onSelectEdge: (edge: GraphEdge | null) => void
}

function InnerGraph({
  nodes: inputNodes,
  edges: inputEdges,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
}: ReactFlowGraphProps) {
  const { fitView } = useReactFlow()

  // Track connected IDs for highlighting
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>()
    const set = new Set<string>([selectedNodeId])
    inputEdges.forEach((e) => {
      const from = (e as any).from || (e as any).source
      const to = (e as any).to || (e as any).target
      if (from === selectedNodeId) set.add(to)
      if (to === selectedNodeId) set.add(from)
    })
    return set
  }, [selectedNodeId, inputEdges])

  // Transform GraphNode -> React Flow Node
  const flowNodes: Node[] = useMemo(() => {
    // If nodes lack x/y coordinates (or all are 0/defaults), compute a circular/grid layout
    const count = inputNodes.length
    const radius = Math.max(260, count * 35)

    return inputNodes.map((n, idx) => {
      let x = n.x ?? 0
      let y = n.y ?? 0

      // If positions are unset or overlapping at origin
      if (x === 0 && y === 0) {
        const angle = (idx / count) * 2 * Math.PI
        x = 500 + radius * Math.cos(angle)
        y = 350 + radius * Math.sin(angle)
      }

      const isSelected = n.id === selectedNodeId
      const isHighlighted = selectedNodeId ? connectedNodeIds.has(n.id) : false

      return {
        id: n.id,
        type: "custom",
        position: { x, y },
        data: {
          ...n,
          isSelected,
          isHighlighted,
        },
      }
    })
  }, [inputNodes, selectedNodeId, connectedNodeIds])

  // Transform GraphEdge -> React Flow Edge
  const flowEdges: Edge[] = useMemo(() => {
    return inputEdges.map((e, idx) => {
      const from = (e as any).from || (e as any).source
      const to = (e as any).to || (e as any).target
      const edgeId = e.id || `edge-${from}-${to}-${idx}`

      const isEdgeActive =
        selectedEdgeId === edgeId ||
        (selectedNodeId && (from === selectedNodeId || to === selectedNodeId))

      const relType = e.relationship_type || e.label || "CONNECTED"
      const isSharedDir = relType === "SHARED_DIRECTOR"
      const isSharedAddr = relType === "SHARED_ADDRESS"
      const isWon = relType === "WON"

      let strokeColor = "rgba(255, 255, 255, 0.15)"
      let strokeWidth = 1.5
      let animated = false

      if (isSharedDir) {
        strokeColor = "#f43f5e" // critical red-pink
        strokeWidth = 2.5
        animated = true
      } else if (isSharedAddr) {
        strokeColor = "#fb923c" // high amber
        strokeWidth = 2.5
        animated = true
      } else if (isWon) {
        strokeColor = "#10b981" // winner green
        strokeWidth = 2
      } else if (isEdgeActive) {
        strokeColor = "#22d3ee" // active cyan
        strokeWidth = 2.5
        animated = true
      }

      return {
        id: edgeId,
        source: from,
        target: to,
        label: e.label || relType,
        animated,
        style: {
          stroke: strokeColor,
          strokeWidth,
          filter: isSharedDir || isSharedAddr || isEdgeActive ? `drop-shadow(0 0 6px ${strokeColor})` : undefined,
        },
        labelStyle: {
          fill: isEdgeActive ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
          fontWeight: 600,
          fontSize: 10,
        },
        labelBgStyle: {
          fill: "#0c1017",
          fillOpacity: 0.85,
          rx: 4,
          ry: 4,
        },
        labelBgPadding: [6, 3] as [number, number],
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: strokeColor,
        },
        data: e,
      }
    })
  }, [inputEdges, selectedEdgeId, selectedNodeId])

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges)

  useEffect(() => {
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [flowNodes, flowEdges, setNodes, setEdges])

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.25, duration: 600 })
    }, 100)
    return () => clearTimeout(timer)
  }, [inputNodes.length, fitView])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const original = inputNodes.find((n) => n.id === node.id)
      onSelectNode(original || null)
      onSelectEdge(null)
    },
    [inputNodes, onSelectNode, onSelectEdge]
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const original = inputEdges.find(
        (e) => (e.id || `edge-${(e as any).from}-${(e as any).to}`) === edge.id
      )
      onSelectEdge(original || (edge.data as any) || null)
      onSelectNode(null)
    },
    [inputEdges, onSelectEdge, onSelectNode]
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null)

  const onNodeMouseEnter = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const original = inputNodes.find((n) => n.id === node.id)
      setHoverTarget({
        type: "node",
        node: original || (node.data as any) || null,
        clientX: event.clientX,
        clientY: event.clientY,
      })
    },
    [inputNodes]
  )

  const onNodeMouseMove = useCallback((event: React.MouseEvent) => {
    setHoverTarget((prev) =>
      prev ? { ...prev, clientX: event.clientX, clientY: event.clientY } : null
    )
  }, [])

  const onNodeMouseLeave = useCallback(() => {
    setHoverTarget(null)
  }, [])

  const onEdgeMouseEnter = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      const original = inputEdges.find(
        (e) => (e.id || `edge-${(e as any).from}-${(e as any).to}`) === edge.id
      )
      setHoverTarget({
        type: "edge",
        edge: original || (edge.data as any) || null,
        clientX: event.clientX,
        clientY: event.clientY,
      })
    },
    [inputEdges]
  )

  const onEdgeMouseMove = useCallback((event: React.MouseEvent) => {
    setHoverTarget((prev) =>
      prev ? { ...prev, clientX: event.clientX, clientY: event.clientY } : null
    )
  }, [])

  const onEdgeMouseLeave = useCallback(() => {
    setHoverTarget(null)
  }, [])

  const onPaneClick = useCallback(() => {
    onSelectNode(null)
    onSelectEdge(null)
    setHoverTarget(null)
  }, [onSelectNode, onSelectEdge])

  return (
    <div ref={containerRef} className="h-full w-full relative overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseMove={onNodeMouseMove}
        onNodeMouseLeave={onNodeMouseLeave}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseMove={onEdgeMouseMove}
        onEdgeMouseLeave={onEdgeMouseLeave}
        fitView
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#22d3ee" gap={24} size={1} style={{ opacity: 0.08 }} />
        <Controls className="!bg-[#0c1017]/95 !border !border-white/10 !rounded-xl !p-1 shadow-2xl [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-white hover:[&>button]:!bg-white/10" />
        <MiniMap
          nodeColor={(n) => {
            const t = (n.data as any)?.type
            if (t === "company") return "#a855f7"
            if (t === "tender") return "#22d3ee"
            if (t === "director") return "#f97316"
            if (t === "address") return "#10b981"
            return "#ffffff"
          }}
          className="!bg-[#0c1017]/95 !border !border-white/10 !rounded-xl shadow-2xl overflow-hidden"
          maskColor="rgba(0, 0, 0, 0.7)"
        />
      </ReactFlow>

      {/* Hovering Flash Card with gist & importance */}
      <HoverFlashCard
        hover={hoverTarget}
        allNodes={inputNodes}
        allEdges={inputEdges}
        containerRect={containerRef.current?.getBoundingClientRect()}
      />
    </div>
  )
}

export function ReactFlowGraph(props: ReactFlowGraphProps) {
  return (
    <ReactFlowProvider>
      <InnerGraph {...props} />
    </ReactFlowProvider>
  )
}
