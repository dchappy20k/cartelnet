"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileSearch,
  ActivitySquare,
  Share2,
  Fingerprint,
  FileText,
  Database,
  Settings,
  LifeBuoy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"

const nav = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Tenders", href: "/tenders", icon: FileSearch },
  { label: "Risk Monitor", href: "/risk-monitor", icon: ActivitySquare },
  { label: "Network", href: "/network", icon: Share2 },
  { label: "Investigations", href: "/investigations", icon: Fingerprint },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Data", href: "/data", icon: Database },
]

const bottom = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: LifeBuoy },
]

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex h-full w-64 flex-col border-r border-white/[0.07] bg-black/60 backdrop-blur-2xl" aria-label="Primary">
      <div className="px-6 py-6 border-b border-white/[0.05]">
        <Logo />
      </div>

      <div className="flex-1 space-y-1.5 px-3.5 py-4">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
          Core Platform
        </div>
        {nav.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-medium transition-all duration-300",
                active
                  ? "bg-white/[0.08] text-foreground border border-white/[0.1] shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)]"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground border border-transparent",
              )}
              aria-current={active ? "page" : undefined}
            >
              <div className="flex items-center gap-3">
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400"
                    style={{ boxShadow: "0 0 12px rgba(34,211,238,0.9)" }}
                    aria-hidden
                  />
                )}
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110",
                    active ? "text-cyan-400" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span>{item.label}</span>
              </div>
              {item.href === "/network" && (
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-cyan-400">
                  Graph
                </span>
              )}
              {item.href === "/risk-monitor" && (
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-indigo-400">
                  AI
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <div className="space-y-1 border-t border-white/[0.06] p-3.5">
        {bottom.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs md:text-sm font-medium transition-all duration-300",
                active ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
