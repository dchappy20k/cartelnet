import type React from "react"
import { cn } from "@/lib/utils"

type Level = "panel" | "card" | "chrome"

export function GlassCard({
  level = "card",
  hover = false,
  className,
  children,
  ...props
}: {
  level?: Level
  hover?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl relative overflow-hidden transition-all duration-300",
        level === "panel" && "glass-panel",
        level === "card" && "glass",
        level === "chrome" && "glass-chrome",
        hover && "glass-hover cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
