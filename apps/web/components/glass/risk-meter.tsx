"use client"

import { useEffect, useState } from "react"
import type { RiskLevel } from "./risk-badge"
import { cn } from "@/lib/utils"

const tone: Record<RiskLevel, { from: string; to: string; text: string }> = {
  low: { from: "#34d399", to: "#22d3ee", text: "text-risk-low" },
  medium: { from: "#fbbf24", to: "#fb923c", text: "text-risk-medium" },
  high: { from: "#fb923c", to: "#f43f5e", text: "text-risk-high" },
  critical: { from: "#f43f5e", to: "#f43f5e", text: "text-risk-critical" },
}

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return "critical"
  if (score >= 60) return "high"
  if (score >= 35) return "medium"
  return "low"
}

export function RiskMeter({
  score,
  level,
  size = "lg",
  animate = true,
}: {
  score: number
  level?: RiskLevel
  size?: "sm" | "lg"
  animate?: boolean
}) {
  const lvl = level ?? scoreToLevel(score)
  const t = tone[lvl]
  const [width, setWidth] = useState(animate ? 0 : score)

  useEffect(() => {
    if (!animate) return
    const id = requestAnimationFrame(() => setWidth(score))
    return () => cancelAnimationFrame(id)
  }, [score, animate])

  return (
    <div className="w-full">
      {size === "lg" && (
        <div className="mb-2 flex items-baseline gap-2">
          <span className={cn("font-mono text-5xl font-semibold tracking-tight", t.text)}>{score}</span>
          <span className="text-lg text-muted-foreground">/ 100</span>
        </div>
      )}
      <div
        className={cn("relative w-full overflow-hidden rounded-full bg-white/5", size === "lg" ? "h-2.5" : "h-1.5")}
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Risk score ${score} of 100, ${lvl}`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${t.from}, ${t.to})`,
            boxShadow: `0 0 16px ${t.to}66`,
          }}
        />
      </div>
    </div>
  )
}
