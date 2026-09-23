# CartelNet UI / UX Guidelines

## 1. Design Direction: Glassmorphism Dark Intelligence
The interface follows a tailored, high-density intelligence dashboard aesthetic.

### Surface Hierarchy (70 / 20 / 10 Rule)
- **70% Solid / Near-Solid Surfaces:** Deep graphite `#0a0c12`, `#0f121b` for readability and focus.
- **20% Glass Panels:** Translucent cards (`rgba(255, 255, 255, 0.03)` with `backdrop-filter: blur(16px)` and thin `rgba(255, 255, 255, 0.08)` borders).
- **10% Accent / Glow:** High-signal accents (Neon Cyan `#22d3ee` for primary interactions, Electric Violet `#a855f7` for investigations, Amber `#f59e0b` for high risk, Rose `#f43f5e` for critical risk).

## 2. Key Pages
- **Overview Dashboard (`/`):** Summary KPIs, Risk Trend chart, attention table.
- **Tenders (`/tenders`):** Full searchable/filterable tender catalog.
- **Tender 360 (`/tenders/[id]`):** 7 operational tabs (Overview, Bidders, Risk Signals, Network, Timeline, Evidence, Investigation).
- **Risk Monitor (`/risk-monitor`):** Real-time signal stream.
- **Network Graph (`/network`):** Interactive SVG / React Flow entity relationship canvas.
- **Investigations (`/investigations`):** Case management workspace drawer.
- **Reports (`/reports`):** Audit report generator and exports.
- **Data Ingestion (`/data`):** 5-step wizard.
