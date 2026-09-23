"use client"

import { useEffect, useState } from "react"
import { Search, Bell, ChevronDown, Menu, Check } from "lucide-react"
import { CommandMenu } from "./command-menu"
import { cn } from "@/lib/utils"

const orgs = ["Directorate of Public Contracts", "Metro Oversight Unit", "Federal Audit Board"]

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const [cmdOpen, setCmdOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [orgOpen, setOrgOpen] = useState(false)
  const [org, setOrg] = useState(orgs[0])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setCmdOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/8 glass-chrome px-4 md:px-6">
        <button
          onClick={onOpenSidebar}
          className="glass-control flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <button
          onClick={() => setCmdOpen(true)}
          className="glass-control group flex h-9 w-full max-w-md items-center gap-3 rounded-md px-3 text-sm text-muted-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search tenders, entities, signals…</span>
          <kbd className="hidden items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] sm:inline-flex">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen((v) => !v)
                setOrgOpen(false)
              }}
              className="glass-control relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-risk-critical" style={{ boxShadow: "0 0 8px var(--risk-critical)" }} />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 z-50 w-80 animate-fade-in glass-panel rounded-lg p-2">
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</div>
                {[
                  { t: "New critical signal — TND-8755", s: "Coordinated withdrawal detected", time: "8m" },
                  { t: "INV-1019 escalated", s: "Assigned to M. Halvorsen", time: "1h" },
                  { t: "Data import complete", s: "1,221 valid rows analysed", time: "3h" },
                ].map((n) => (
                  <div key={n.t} className="flex gap-2 rounded-md px-2 py-2 hover:bg-white/5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-foreground">{n.t}</div>
                      <div className="truncate text-xs text-muted-foreground">{n.s}</div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{n.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Org switcher */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => {
                setOrgOpen((v) => !v)
                setNotifOpen(false)
              }}
              className="glass-control flex h-9 items-center gap-2 rounded-md px-3 text-sm text-foreground"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-accent to-violet text-[10px] font-bold text-black">
                {org.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <span className="max-w-[140px] truncate">{org}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {orgOpen && (
              <div className="absolute right-0 top-11 z-50 w-64 animate-fade-in glass-panel rounded-lg p-2">
                <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Organization</div>
                {orgs.map((o) => (
                  <button
                    key={o}
                    onClick={() => {
                      setOrg(o)
                      setOrgOpen(false)
                    }}
                    className={cn("flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-white/5", o === org ? "text-foreground" : "text-muted-foreground")}
                  >
                    <span className="flex-1 truncate">{o}</span>
                    {o === org && <Check className="h-3.5 w-3.5 text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Avatar */}
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-gradient-to-br from-accent/80 to-violet/80 text-xs font-semibold text-black" aria-label="Account">
            AO
          </button>
        </div>
      </header>

      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  )
}
