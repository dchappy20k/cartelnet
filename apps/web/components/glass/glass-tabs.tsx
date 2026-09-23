"use client"

import { cn } from "@/lib/utils"

export function GlassTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: string[]
  active: string
  onChange: (t: string) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto rounded-lg border border-white/8 bg-white/[0.03] p-1 scroll-thin",
        className,
      )}
      role="tablist"
    >
      {tabs.map((t) => {
        const isActive = t === active
        return (
          <button
            key={t}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t)}
            className={cn(
              "relative whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-white/8 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isActive && (
              <span
                className="absolute inset-x-3 -bottom-px h-px bg-accent"
                style={{ boxShadow: "0 0 8px var(--accent)" }}
                aria-hidden
              />
            )}
            {t}
          </button>
        )
      })}
    </div>
  )
}
