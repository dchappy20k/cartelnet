import { LifeBuoy, BookOpen, MessageSquare, ShieldAlert } from "lucide-react"
import { PageHeader } from "@/components/shell/page-header"
import { GlassCard } from "@/components/glass/glass-card"

const faqs = [
  { q: "What does a risk signal mean?", a: "A signal indicates a pattern that warrants human review. It is not a determination of wrongdoing." },
  { q: "How is the risk score calculated?", a: "Scores are a composite of detected signals weighted by confidence and severity." },
  { q: "Can I export evidence?", a: "Yes — generate a report from the Reports page and export as PDF or CSV." },
]

const links = [
  { icon: BookOpen, label: "Documentation", desc: "Guides and detection methodology" },
  { icon: MessageSquare, label: "Contact support", desc: "Reach the intelligence operations team" },
  { icon: ShieldAlert, label: "Report an issue", desc: "Flag a false positive or data problem" },
]

export default function HelpPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Help & Support" subtitle="Documentation, methodology, and support for the CartelNet platform." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {links.map((l) => (
          <GlassCard key={l.label} hover className="p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-accent">
              <l.icon className="h-4 w-4" />
            </span>
            <div className="mt-3 text-sm font-medium text-foreground">{l.label}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{l.desc}</div>
          </GlassCard>
        ))}
      </div>
      <GlassCard level="panel" className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <LifeBuoy className="h-4 w-4 text-accent" />
          Frequently asked
        </h3>
        <div className="divide-y divide-white/8">
          {faqs.map((f) => (
            <div key={f.q} className="py-4 first:pt-0 last:pb-0">
              <div className="text-sm font-medium text-foreground">{f.q}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
