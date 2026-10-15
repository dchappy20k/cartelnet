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
        "inline-flex items-center gap-1.5 overflow-x-auto rounded-full border border-white/[0.08] bg-black/40 p-1.5 backdrop-blur-xl scroll-thin shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
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
              "relative whitespace-nowrap rounded-full px-4 py-1.5 text-xs md:text-sm font-medium transition-all duration-300 cursor-pointer",
              isActive
                ? "bg-white/[0.1] text-foreground border border-white/[0.14] shadow-[0_2px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent",
            )}
          >
            {isActive && (
              <span
                className="absolute inset-x-4 -bottom-0.5 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80"
                style={{ boxShadow: "0 0 10px rgba(34,211,238,0.8)" }}
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
