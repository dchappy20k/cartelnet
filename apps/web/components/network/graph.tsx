"use client"

import { useMemo, useState } from "react"
import { graphNodes, graphEdges, nodeStyles, type GraphNode } from "./graph-data"
import { cn } from "@/lib/utils"

export function NetworkGraph({ onSelectCompany }: { onSelectCompany: (companyId: string) => void }) {
  const [selected, setSelected] = useState<string | null>("t1")

  const connectedIds = useMemo(() => {
    if (!selected) return new Set<string>()
    const set = new Set<string>([selected])
    graphEdges.forEach((e) => {
      if (e.from === selected) set.add(e.to)
      if (e.to === selected) set.add(e.from)
    })
    return set
  }, [selected])

  const isEdgeActive = (from: string, to: string) => selected != null && (from === selected || to === selected)

  const handleClick = (node: GraphNode) => {
    setSelected(node.id)
    if (node.type === "company" && node.companyId) onSelectCompany(node.companyId)
  }

  const nodeById = (id: string) => graphNodes.find((n) => n.id === id)!

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
        {graphEdges.map((e, i) => {
          const a = nodeById(e.from)
          const b = nodeById(e.to)
          const active = isEdgeActive(e.from, e.to)
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          return (
            <g key={i}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={active ? "rgba(34,211,238,0.55)" : "rgba(255,255,255,0.1)"}
                strokeWidth={active ? 1.75 : 1}
                style={active ? { filter: "drop-shadow(0 0 4px rgba(34,211,238,0.6))" } : undefined}
              />
              {active && e.label && (
                <text x={mx} y={my - 4} textAnchor="middle" className="fill-[rgba(255,255,255,0.6)]" fontSize="9">
                  {e.label}
                </text>
              )}
            </g>
          )
        })}

        {/* nodes */}
        {graphNodes.map((n) => {
          const style = nodeStyles[n.type]
          const isSel = n.id === selected
          const dim = selected != null && !connectedIds.has(n.id)
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              className="cursor-pointer"
              opacity={dim ? 0.35 : 1}
              onClick={() => handleClick(n)}
              style={{ transition: "opacity 200ms ease" }}
            >
              {isSel && <circle r={style.r + 14} fill="url(#node-glow)" />}
              {isSel && (
                <circle
                  r={style.r + 6}
                  fill="none"
                  stroke={style.color}
                  strokeWidth="1.5"
                  opacity="0.5"
                  style={{ filter: `drop-shadow(0 0 8px ${style.color})` }}
                />
              )}
              <circle
                r={style.r}
                fill="rgba(10,12,18,0.85)"
                stroke={style.color}
                strokeWidth="2"
                style={{ filter: `drop-shadow(0 0 ${isSel ? 10 : 5}px ${style.color}${isSel ? "aa" : "66"})` }}
              />
              <circle r={style.r * 0.32} fill={style.color} opacity={0.9} />
              <text
                y={style.r + 14}
                textAnchor="middle"
                className="fill-[rgba(255,255,255,0.82)] font-medium"
                fontSize="11"
              >
                {n.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border border-white/8 bg-black/40 p-2.5 backdrop-blur-md">
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
