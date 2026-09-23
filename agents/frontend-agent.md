# Frontend Agent Instructions

## Scope & Mandate
You own `apps/web/` (Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts, Lucide, React Flow).

## Core Directives
1. **Preserve Design Direction:** Maintain the glassmorphism dark aesthetic (graphite background `#0a0c12`, subtle cyan/violet glows, backdrop-blur cards).
2. **Explainability & Disclaimer:** Always include the human review disclaimer banner. Never display "Cartel Confirmed" or "Guilty". Use "Elevated Risk", "Risk Signal", "Requires Human Review".
3. **API Integration:** Connect UI components to `/api/v1/` using TanStack Query.
4. **Zero Placeholders:** Interactive buttons and links must route to real destinations or open operational drawers.
