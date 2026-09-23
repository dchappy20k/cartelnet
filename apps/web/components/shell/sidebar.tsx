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
    <nav className="flex h-full w-64 flex-col glass-chrome" aria-label="Primary">
      <div className="px-5 py-5">
        <Logo />
      </div>

      <div className="flex-1 space-y-1 px-3">
        <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          Workspace
        </div>
        {nav.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-white/[0.07] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                  style={{ boxShadow: "0 0 10px var(--accent)" }}
                  aria-hidden
                />
              )}
              <item.icon
                className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-accent" : "text-muted-foreground group-hover:text-foreground")}
              />
              {item.label}
            </Link>
          )
        })}
      </div>

      <div className="space-y-1 border-t border-white/8 p-3">
        {bottom.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                active ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
