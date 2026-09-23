"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, CornerDownLeft, FileSearch, Fingerprint, Share2, FileText } from "lucide-react"
import { tenders, investigations } from "@/lib/data"
import { cn } from "@/lib/utils"

type Item = { label: string; sub: string; href: string; icon: React.ComponentType<{ className?: string }> }

export function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)

  const items = useMemo<Item[]>(() => {
    const base: Item[] = [
      { label: "Overview", sub: "Procurement dashboard", href: "/", icon: FileText },
      { label: "Network", sub: "Relationship graph", href: "/network", icon: Share2 },
      ...tenders.map((t) => ({ label: t.name, sub: `${t.id} · ${t.authority}`, href: `/tenders/${t.id}`, icon: FileSearch })),
      ...investigations.map((i) => ({ label: i.title, sub: `${i.id} · ${i.status}`, href: `/investigations`, icon: Fingerprint })),
    ]
    if (!query) return base.slice(0, 8)
    const q = query.toLowerCase()
    return base.filter((i) => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)).slice(0, 8)
  }, [query])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActive((a) => Math.min(a + 1, items.length - 1))
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActive((a) => Math.max(a - 1, 0))
      }
      if (e.key === "Enter" && items[active]) {
        router.push(items[active].href)
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, items, active, router, onClose])

  useEffect(() => {
    if (open) setQuery("")
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 animate-overlay-in bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-xl animate-fade-in glass-panel overflow-hidden rounded-xl" role="dialog" aria-modal="true" aria-label="Command menu">
        <div className="flex items-center gap-3 border-b border-white/8 px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tenders, investigations, entities…"
            className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto scroll-thin p-2">
          {items.length === 0 && <div className="px-3 py-8 text-center text-sm text-muted-foreground">No results found</div>}
          {items.map((item, i) => (
            <button
              key={item.href + item.label}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                router.push(item.href)
                onClose()
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                i === active ? "bg-white/8" : "hover:bg-white/5",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{item.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.sub}</span>
              </span>
              {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
