# CartelNet — Project State

## Current Position
- **Milestone:** Milestone 1 — CartelNet MVP
- **Active Phase:** Phase 5 (Investigation Case Management & Report Generation) — ✅ COMPLETED
- **Next Phase:** Phase 6 (Multi-Tenant Auth, Golden Path Seeding & Final Verification)

---

## Roadmap Status
| Phase | Name | Status |
|---|---|---|
| **Phase 1** | Repository Structure & Monorepo Foundation | ✅ Completed |
| **Phase 2** | Ingestion Pipeline & Data Normalization | ✅ Completed |
| **Phase 3** | Risk Detection Engine & Explainable Scoring | ✅ Completed |
| **Phase 4** | NetworkX Graph Projection & Interactive Visualization | ✅ Completed |
| **Phase 5** | Investigation Case Management & Report Generation | ✅ Completed |
| **Phase 6** | Multi-Tenant Auth, Golden Path Seeding & Final Verification | ⏳ Next Up |

---

## Phase 5 Accomplishments
1. **Investigation Case Management Subsystem (`apps/api/app/modules/investigations/`):**
   - Implemented `Investigation` and `InvestigationNote` ORM models linked to `Tender` with tenant isolation.
   - Built complete case lifecycle service: case reference generation (`CASE-2026-XXX`), entity and risk signal linking, status changes (`Open`, `Under Review`, `Escalated`, `Closed`), and priority assignments.
   - Implemented immutable, timestamped note logging by investigators with automated status-change audit trails.
2. **Audit Report Generator Subsystem (`apps/api/app/modules/reports/`):**
   - Implemented template engine supporting `TENDER_RISK_AUDIT` and `INVESTIGATION_CASE_DOSSIER`.
   - Generates structured, explainable executive summaries, bidding tables, risk signals, and evidence logs.
   - Built multi-format rendering engine supporting clean printable HTML (with safety disclaimers) and Markdown.
3. **API Endpoints:**
   - `GET /api/v1/investigations/`: List cases with status and priority filtering.
   - `POST /api/v1/investigations/`: Create new investigation case linked to tender.
   - `GET /api/v1/investigations/{identifier}`: 360-degree case details with bids, signals, evidence, and notes.
   - `PATCH /api/v1/investigations/{identifier}`: Update status/priority with audit note logging.
   - `POST /api/v1/investigations/{identifier}/notes`: Log timestamped investigator note.
   - `GET /api/v1/reports/templates`: List report types and supported formats.
   - `POST /api/v1/reports/generate`: Generate HTML/Markdown audit reports.
4. **Frontend Integration (`apps/web`):**
   - Added API methods to `apps/web/lib/api-client.ts`.
   - Built case creation modal in `apps/web/app/(app)/investigations/page.tsx` with tender linking, priority levels, and initial audit notes.
   - Enhanced `apps/web/components/investigations/workspace.tsx` with live 360 data, real-time note logging, status escalation/closure, and one-click "Generate Audit Report" in a printable view.
5. **Testing & Quality Assurance:**
   - **23/23 tests passing 100% in pytest** across all modules.
   - **All 11 Next.js web routes compiled cleanly** in production build (`npm run build`).
