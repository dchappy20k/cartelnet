"use client"

import React, { useState } from "react"
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Info,
  ExternalLink,
  FolderPlus,
  Users,
  MapPin,
  Flame,
} from "lucide-react"
import { GlassCard } from "@/components/glass/glass-card"
import { GlassBadge } from "@/components/glass/glass-badge"
import { GlassButton } from "@/components/glass/glass-button"
import { type GraphSignalOut } from "@/lib/api-client"

interface SignalsDockProps {
  signals: GraphSignalOut[]
  onSelectSignalEntities: (entityIds: string[]) => void
  onCreateInvestigation?: (signal: GraphSignalOut) => void
}

export function SignalsDock({
  signals,
  onSelectSignalEntities,
  onCreateInvestigation,
}: SignalsDockProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null)

  if (!signals || signals.length === 0) return null

  const activeSignal = signals.find((s) => s.id === selectedSignalId) || signals[0]

  return (
    <div className="rounded-xl border border-white/10 bg-[#090d14]/95 shadow-2xl backdrop-blur-xl transition-all duration-300">
      {/* Dock Bar Header */}
      <div
        className="flex items-center justify-between px-5 py-3 cursor-pointer select-none border-b border-white/8"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Topological Risk Signals
              <span className="rounded-full bg-red-500/20 text-red-300 px-2 py-0.2 text-[10px] font-bold border border-red-500/30">
                {signals.length} Signals Identified
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="hidden md:block text-[11px] text-muted-foreground italic">
            Objective structural indicators · Human review required
          </p>
          <button className="text-muted-foreground hover:text-white p-1">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Signal Details */}
      {isExpanded && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Signal Selection List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {signals.map((sig) => {
              const isSelected = sig.id === activeSignal?.id
              return (
                <div
                  key={sig.id}
                  onClick={() => {
                    setSelectedSignalId(sig.id)
                    onSelectSignalEntities(sig.entity_ids)
                  }}
                  className={`rounded-lg border p-2.5 cursor-pointer transition-all ${
                    isSelected
                      ? "border-accent bg-accent/10 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {sig.signal_type}
                    </span>
                    <GlassBadge
                      tone={
                        sig.severity === "critical"
                          ? "critical"
                          : sig.severity === "high"
                          ? "high"
                          : "medium"
                      }
                    >
                      {sig.severity.toUpperCase()}
                    </GlassBadge>
                  </div>
                  <h5 className="text-xs font-semibold text-foreground truncate">{sig.title}</h5>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {sig.explanation}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Active Signal Deep-Dive */}
          {activeSignal && (
            <div className="lg:col-span-2 rounded-lg border border-white/8 bg-black/40 p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-accent">
                        {activeSignal.signal_type}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        (Confidence: {Math.round(activeSignal.confidence * 100)}%)
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1">{activeSignal.title}</h4>
                  </div>

                  <GlassButton
                    variant="accent"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      onSelectSignalEntities(activeSignal.entity_ids)
                      if (onCreateInvestigation) onCreateInvestigation(activeSignal)
                    }}
                  >
                    <FolderPlus className="h-3.5 w-3.5 mr-1" />
                    Review & Investigate
                  </GlassButton>
                </div>

                <p className="text-xs text-white/80 mt-2 leading-relaxed">
                  {activeSignal.explanation}
                </p>

                {activeSignal.evidence && activeSignal.evidence.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Documented Evidence
                    </span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {activeSignal.evidence.map((ev, i) => (
                        <div
                          key={i}
                          className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/90"
                        >
                          {typeof ev === "object" ? JSON.stringify(ev) : String(ev)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Info className="h-3 w-3 text-cyan-400" />
                  Connected Entities: {activeSignal.entity_ids.join(", ")}
                </span>
                <span>Clicking this signal highlights involved nodes in the graph canvas</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
