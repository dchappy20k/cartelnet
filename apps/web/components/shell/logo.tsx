import { cn } from "@/lib/utils"

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] shadow-[0_0_20px_rgba(34,211,238,0.18)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <defs>
            <linearGradient id="cn-logo" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22d3ee" />
              <stop offset="1" stopColor="#8b7cf6" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="4" r="2.2" fill="url(#cn-logo)" />
          <circle cx="4.5" cy="17" r="2.2" fill="url(#cn-logo)" />
          <circle cx="19.5" cy="17" r="2.2" fill="url(#cn-logo)" />
          <path
            d="M12 6.2 5 15.2M12 6.2 19 15.2M6.7 17h10.6"
            stroke="url(#cn-logo)"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>
      </span>
      {showWordmark && (
        <div className="leading-none">
          <div className="text-sm font-semibold tracking-tight text-foreground">
            Cartel<span className="text-accent">Net</span>
          </div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Risk Intelligence
          </div>
        </div>
      )}
    </div>
  )
}
