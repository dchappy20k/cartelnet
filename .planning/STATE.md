# CartelNet — Project State

## Current Position
- **Milestone:** Milestone 1 — CartelNet MVP
- **Active Phase:** Phase 4 (NetworkX Graph Projection & Interactive Visualization) — ✅ COMPLETED
- **Next Phase:** Phase 5 (Investigation Case Management & Report Generation)

---

## Roadmap Status
| Phase | Name | Status |
|---|---|---|
| **Phase 1** | Repository Structure & Monorepo Foundation | ✅ Completed |
| **Phase 2** | Ingestion Pipeline & Data Normalization | ✅ Completed |
| **Phase 3** | Risk Detection Engine & Explainable Scoring | ✅ Completed |
| **Phase 4** | NetworkX Graph Projection & Interactive Visualization | ✅ Completed |
| **Phase 5** | Investigation Case Management & Report Generation | ⏳ Next Up |
| **Phase 6** | Multi-Tenant Auth, Golden Path Seeding & Final Verification | ⏳ Pending |

---

## Phase 4 Accomplishments
1. **NetworkX Entity Graph Projection Service (`apps/api/app/modules/network/service.py`):**
   - Implemented relational entity projection: Tenders, Companies, Directors, Addresses, and Bids mapped into NetworkX graphs.
   - Built deterministic force-directed layout computation (`nx.spring_layout`) normalized to standard 800x500 SVG coordinate system.
   - Implemented ego-subgraph projection for focused single-tender analysis (`TND-8842` centered at (400, 250)).
2. **Dense Collusion Cluster Discovery:**
   - Detects `SHARED_DIRECTORS` and `SHARED_ADDRESS` clusters with full company listings and tender linkage.
3. **Comprehensive Entity Dossier API:**
   - Computes win/loss rates, total bid amounts, connected officers, historical co-bidders, and related risk signals.
4. **API Endpoints:**
   - `GET /api/v1/network/graph`: Global dynamic 2D graph with node/edge summaries.
   - `GET /api/v1/network/tenders/{tender_id}/graph`: Tender ego-subgraph.
   - `GET /api/v1/network/clusters`: Detected collusion clusters.
   - `GET /api/v1/network/companies/{company_id}/dossier`: Full entity dossier.
5. **Frontend Canvas & Live Integration (`apps/web`):**
   - Type-safe API client in `apps/web/lib/api-client.ts` with offline resilience fallback.
   - Interactive Network visualizer with tender scope selector (`All Entities`, `TND-8842`, `TND-8755`, `TND-8817`).
   - Dynamic node and link counters in the glassmorphic card header.
   - Enhanced `CompanyDrawer` rendering live corporate registry information, win rates, officers, co-bidders, and risk signals.
6. **Testing & Build Verification:**
   - **17/17 tests passing 100% in pytest** across health, ingestion, risk engine, and network graph modules.
   - **All 11 Next.js web routes compiled cleanly** in production build (`npm run build`).
7. **Institutional Documentation & GitHub Push:**
   - Comprehensive end-to-end `README.md` with system architecture diagrams, deterministic detector specs, judge walkthrough guide, and quickstart instructions.
   - Committed and pushed to `https://github.com/dchappy20k/cartelnet.git`.
