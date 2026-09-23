"use client"

import { useMemo, useState } from "react"
import { graphNodes as defaultNodes, graphEdges as defaultEdges, nodeStyles, type GraphNode, type GraphEdge } from "./graph-data"

interface NetworkGraphProps {
  onSelectCompany: (companyId: string) => void
  nodes?: GraphNode[]
  edges?: GraphEdge[]
}

export function NetworkGraph({ onSelectCompany, nodes: propNodes, edges: propEdges }: NetworkGraphProps) {
  const currentNodes = propNodes && propNodes.length > 0 ? propNodes : defaultNodes
  const currentEdges = propEdges && propEdges.length > 0 ? propEdges : defaultEdges

  const firstSelectable = currentNodes[0]?.id || null
  const [selected, setSelected] = useState<string | null>(firstSelectable)

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>()
    for (const n of currentNodes) {
      map.set(n.id, n)
    }
    return map
  }, [currentNodes])

  const connectedIds = useMemo(() => {
    if (!selected) return new Set<string>()
    const set = new Set<string>([selected])
    currentEdges.forEach((e) => {
      const from = (e as any).from || (e as any).source
      const to = (e as any).to || (e as any).target
      if (from === selected) set.add(to)
      if (to === selected) set.add(from)
    })
    return set
  }, [selected, currentEdges])

  const isEdgeActive = (from: string, to: string) => selected != null && (from === selected || to === selected)

  const handleClick = (node: GraphNode) => {
    setSelected(node.id)
    if (node.type === "company") {
      const compId = node.companyId || node.id
      onSelectCompany(compId)
    }
  }

  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 800 500" className="h-full w-full" role="img" aria-label="Entity relationship graph">
        <defs>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.25" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* edges */}
        {currentEdges.map((e, i) => {
          const from = (e as any).from || (e as any).source
          const to = (e as any).to || (e as any).target
          const a = nodeMap.get(from)
          const b = nodeMap.get(to)
          if (!a || !b) return null

          const active = isEdgeActive(from, to)
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          return (
            <g key={i}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={active ? "rgba(34,211,238,0.7)" : "rgba(255,255,255,0.12)"}
                strokeWidth={active ? 2 : 1}
                style={active ? { filter: "drop-shadow(0 0 5px rgba(34,211,238,0.7))" } : undefined}
              />
              {active && e.label && (
                <text x={mx} y={my - 4} textAnchor="middle" className="fill-[rgba(255,255,255,0.85)] font-mono text-[9px]">
                  {e.label}
                </text>
              )}
            </g>
          )
        })}

        {/* nodes */}
        {currentNodes.map((n) => {
          const style = nodeStyles[n.type] || nodeStyles.company
          const isSel = n.id === selected
          const dim = selected != null && !connectedIds.has(n.id)
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              className="cursor-pointer"
              opacity={dim ? 0.3 : 1}
              onClick={() => handleClick(n)}
              style={{ transition: "opacity 200ms ease, transform 300ms ease" }}
            >
              {isSel && <circle r={style.r + 14} fill="url(#node-glow)" />}
              {isSel && (
                <circle
                  r={style.r + 6}
                  fill="none"
                  stroke={style.color}
                  strokeWidth="1.5"
                  opacity="0.6"
                  style={{ filter: `drop-shadow(0 0 10px ${style.color})` }}
                />
              )}
              <circle
                r={style.r}
                fill="rgba(10,12,18,0.92)"
                stroke={style.color}
                strokeWidth="2"
                style={{ filter: `drop-shadow(0 0 ${isSel ? 12 : 5}px ${style.color}${isSel ? "cc" : "66"})` }}
              />
              <circle r={style.r * 0.35} fill={style.color} opacity={0.9} />
              <text
                y={style.r + 14}
                textAnchor="middle"
                className="fill-[rgba(255,255,255,0.88)] font-medium"
                fontSize="11"
              >
                {n.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border border-white/8 bg-black/50 p-2.5 backdrop-blur-md">
        {Object.entries(nodeStyles).map(([type, s]) => (
          <span key={type} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
