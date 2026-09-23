import { cn } from "@/lib/utils"

export type RiskLevel = "low" | "medium" | "high" | "critical"

const config: Record<RiskLevel, { label: string; dot: string; text: string; ring: string; bg: string }> = {
  low: {
    label: "Low",
    dot: "bg-risk-low",
    text: "text-risk-low",
    ring: "border-risk-low/35",
    bg: "bg-risk-low/10",
  },
  medium: {
    label: "Medium",
    dot: "bg-risk-medium",
    text: "text-risk-medium",
    ring: "border-risk-medium/35",
    bg: "bg-risk-medium/10",
  },
  high: {
    label: "High",
    dot: "bg-risk-high",
    text: "text-risk-high",
    ring: "border-risk-high/35",
    bg: "bg-risk-high/10",
  },
  critical: {
    label: "Critical",
    dot: "bg-risk-critical",
    text: "text-risk-critical",
    ring: "border-risk-critical/40",
    bg: "bg-risk-critical/12",
  },
}

export function RiskBadge({
  level,
  className,
  showDot = true,
}: {
  level: RiskLevel
  className?: string
  showDot?: boolean
}) {
  const c = config[level]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
        c.ring,
        c.bg,
        c.text,
        className,
      )}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", c.dot)}
          style={{ boxShadow: "0 0 8px currentColor" }}
          aria-hidden
        />
      )}
      {c.label}
    </span>
  )
}
