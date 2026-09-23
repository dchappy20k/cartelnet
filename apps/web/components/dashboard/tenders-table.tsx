"use client"

import Link from "next/link"
import { AlertTriangle, ArrowUpRight } from "lucide-react"
import type { Tender } from "@/lib/data"
import { formatCurrency } from "@/lib/data"
import { RiskBadge } from "@/components/glass/risk-badge"

export function TendersTable({ rows }: { rows: Tender[] }) {
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Tender</th>
            <th className="px-4 py-3 font-medium">Authority</th>
            <th className="px-4 py-3 font-medium text-right">Value</th>
            <th className="px-4 py-3 font-medium text-center">Bidders</th>
            <th className="px-4 py-3 font-medium">Risk</th>
            <th className="px-4 py-3 font-medium text-center">Signals</th>
            <th className="px-4 py-3 font-medium text-right">Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr
              key={t.id}
              className="group border-t border-white/6 transition-colors hover:bg-white/[0.035]"
            >
              <td className="px-4 py-3.5">
                <Link href={`/tenders/${t.id}`} className="block">
                  <span className="block font-medium text-foreground group-hover:text-accent">{t.name}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{t.id}</span>
                </Link>
              </td>
              <td className="px-4 py-3.5 text-muted-foreground">{t.authority}</td>
              <td className="px-4 py-3.5 text-right font-mono text-foreground">{formatCurrency(t.value)}</td>
              <td className="px-4 py-3.5 text-center font-mono text-muted-foreground">{t.bidders}</td>
              <td className="px-4 py-3.5">
                <RiskBadge level={t.risk} />
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center justify-center gap-1.5">
                  {t.signals > 0 ? (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
                      <span className="font-mono text-foreground">{t.signals}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">{t.updated}</td>
              <td className="px-4 py-3.5 text-right">
                <Link
                  href={`/tenders/${t.id}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-white/8 hover:text-foreground group-hover:opacity-100"
                  aria-label={`Open ${t.name}`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
