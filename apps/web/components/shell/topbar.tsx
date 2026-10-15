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
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/[0.07] bg-black/50 backdrop-blur-2xl px-4 md:px-7">
        <button
          onClick={onOpenSidebar}
          className="glass-control flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground lg:hidden cursor-pointer"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <button
          onClick={() => setCmdOpen(true)}
          className="group flex h-9.5 w-full max-w-md items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 text-xs md:text-sm text-muted-foreground transition-all duration-300 hover:border-cyan-500/30 hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(34,211,238,0.12)] cursor-pointer"
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
          <span className="flex-1 text-left truncate">Search tenders, entities, signals…</span>
          <kbd className="hidden items-center gap-0.5 rounded-full border border-white/[0.1] bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-3">
          {/* Framer Live Status Pill */}
          <div className="hidden xl:inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.12)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>AI Risk Engine Online</span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen((v) => !v)
                setOrgOpen(false)
              }}
              className="relative flex h-9.5 w-9.5 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.07] hover:border-white/[0.16] transition-all duration-200 cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 animate-fade-in rounded-2xl border border-white/[0.1] bg-black/80 p-2.5 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">Notifications</div>
                {[
                  { t: "New critical signal — TND-8755", s: "Coordinated withdrawal detected", time: "8m" },
                  { t: "INV-1019 escalated", s: "Assigned to M. Halvorsen", time: "1h" },
                  { t: "Data import complete", s: "1,221 valid rows analysed", time: "3h" },
                ].map((n) => (
                  <div key={n.t} className="flex gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.06] cursor-pointer">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{n.t}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{n.s}</div>
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
              className="flex h-9.5 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs font-medium text-foreground hover:bg-white/[0.07] hover:border-white/[0.16] transition-all duration-200 cursor-pointer"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-[10px] font-bold text-slate-950 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                {org.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <span className="max-w-[130px] truncate">{org}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
            {orgOpen && (
              <div className="absolute right-0 top-12 z-50 w-64 animate-fade-in rounded-2xl border border-white/[0.1] bg-black/80 p-2 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">Organization</div>
                {orgs.map((o) => (
                  <button
                    key={o}
                    onClick={() => {
                      setOrg(o)
                      setOrgOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-white/[0.06] cursor-pointer",
                      o === org ? "text-cyan-400 font-medium bg-white/[0.04]" : "text-muted-foreground",
                    )}
                  >
                    <span className="flex-1 truncate">{o}</span>
                    {o === org && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Avatar with luminous border */}
          <button className="flex h-9.5 w-9.5 items-center justify-center rounded-full border border-white/[0.14] bg-gradient-to-br from-cyan-400 to-indigo-500 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.25)] hover:scale-105 transition-transform duration-200 cursor-pointer" aria-label="Account">
            AO
          </button>
        </div>
      </header>

      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  )
}
