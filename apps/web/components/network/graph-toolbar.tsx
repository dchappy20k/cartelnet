"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Search,
  Filter,
  Layers,
  Calendar,
  Download,
  RotateCcw,
  Maximize2,
  Building2,
  FileText,
  User,
  MapPin,
  Check,
  X,
} from "lucide-react"
import { GlassButton } from "@/components/glass/glass-button"
import { searchGraphEntities, type EntitySearchResult } from "@/lib/api-client"

interface GraphToolbarProps {
  currentDepth: number
  onDepthChange: (depth: number) => void
  selectedNodeType: string
  onNodeTypeChange: (type: string) => void
  selectedRelType: string
  onRelTypeChange: (type: string) => void
  selectedYear: string
  onYearChange: (year: string) => void
  onSelectSearchResult: (result: EntitySearchResult) => void
  onReset: () => void
  onExport: () => void
}

const NODE_TYPE_OPTIONS = [
  { id: "all", label: "All Entities" },
  { id: "company", label: "Companies" },
  { id: "tender", label: "Tenders" },
  { id: "director", label: "Directors" },
  { id: "address", label: "Addresses" },
  { id: "authority", label: "Authorities" },
  { id: "bid", label: "Bids" },
]

const REL_TYPE_OPTIONS = [
  { id: "all", label: "All Links" },
  { id: "SHARED_DIRECTOR", label: "Shared Director" },
  { id: "SHARED_ADDRESS", label: "Shared Address" },
  { id: "PARTICIPATED_IN", label: "Participated In" },
  { id: "HAS_DIRECTOR", label: "Has Director" },
  { id: "REGISTERED_AT", label: "Registered At" },
  { id: "WON", label: "Tender Awarded" },
]

const YEAR_OPTIONS = [
  { id: "all", label: "All Time" },
  { id: "2024", label: "2024" },
  { id: "2025", label: "2025" },
  { id: "2026", label: "2026" },
]

export function GraphToolbar({
  currentDepth,
  onDepthChange,
  selectedNodeType,
  onNodeTypeChange,
  selectedRelType,
  onRelTypeChange,
  selectedYear,
  onYearChange,
  onSelectSearchResult,
  onReset,
  onExport,
}: GraphToolbarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<EntitySearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsDropdownOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchGraphEntities(searchQuery)
        setSearchResults(results)
        setIsDropdownOpen(true)
      } catch (err) {
        console.error("Search failed:", err)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="space-y-3">
      {/* Top row: Search bar + Depth + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search input with autocomplete */}
        <div ref={searchRef} className="relative flex-1 min-w-[280px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies, tenders, directors, addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setIsDropdownOpen(true)
              }}
              className="w-full rounded-xl border border-white/10 bg-[#0c1017]/90 pl-10 pr-10 py-2 text-xs text-foreground placeholder-muted-foreground focus:border-accent focus:outline-none shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setIsDropdownOpen(false)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete dropdown */}
          {isDropdownOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-white/10 bg-[#090d14]/95 p-2 shadow-2xl backdrop-blur-xl max-h-72 overflow-y-auto">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-1">
                Matched Entities ({searchResults.length})
              </div>
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectSearchResult(item)
                    setIsDropdownOpen(false)
                    setSearchQuery(item.label)
                  }}
                  className="flex items-center justify-between rounded-lg p-2 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {item.subtitle || item.id}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase font-mono text-cyan-300">
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Depth selector */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0c1017]/90 px-3 py-1.5 text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-accent" />
            Depth:
          </span>
          {[1, 2, 3].map((d) => (
            <button
              key={d}
              onClick={() => onDepthChange(d)}
              className={`rounded-lg px-2.5 py-0.5 text-xs font-bold transition-all ${
                currentDepth === d
                  ? "bg-accent text-black shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Timeline year selector */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0c1017]/90 px-3 py-1.5 text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-violet-400" />
            Year:
          </span>
          {YEAR_OPTIONS.map((y) => (
            <button
              key={y.id}
              onClick={() => onYearChange(y.id)}
              className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-all ${
                selectedYear === y.id
                  ? "bg-violet-500 text-white font-semibold shadow-[0_0_8px_rgba(139,124,246,0.4)]"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {y.label}
            </button>
          ))}
        </div>

        {/* Actions: Reset & Export */}
        <div className="flex items-center gap-2">
          <GlassButton variant="default" size="sm" onClick={onReset} title="Reset Graph View">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </GlassButton>
          <GlassButton variant="default" size="sm" onClick={onExport} title="Export Graph Data JSON">
            <Download className="h-3.5 w-3.5 mr-1" />
            Export JSON
          </GlassButton>
        </div>
      </div>

      {/* Second row: Filter Pills for Node and Link types */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-xs">
        {/* Node types */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3" /> Entity:
          </span>
          {NODE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onNodeTypeChange(opt.id)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                selectedNodeType === opt.id
                  ? "bg-accent/20 text-accent border border-accent/40"
                  : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.08] hover:text-white border border-white/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Relationship types */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mr-1">
            Relationship:
          </span>
          {REL_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onRelTypeChange(opt.id)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                selectedRelType === opt.id
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                  : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.08] hover:text-white border border-white/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
