import type React from "react"
import { Sparkles } from "lucide-react"

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
}: {
  title: string
  subtitle?: string
  badge?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/[0.06] pb-6">
      <div className="space-y-1.5">
        {badge && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent tracking-wide shadow-[0_0_12px_rgba(34,211,238,0.15)] mb-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
            </span>
            {badge}
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-gradient-silver sm:text-3xl md:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2.5 pt-2 sm:pt-0">{actions}</div>}
    </div>
  )
}
