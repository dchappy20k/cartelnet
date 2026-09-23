# CartelNet — Product Roadmap (Milestone 1: MVP)

## Milestone 1: CartelNet MVP

The goal of Milestone 1 is to deliver a fully functional, explainable procurement cartel intelligence platform following the golden flow:
`Import → Normalize → Screen → Explain → Investigate`

---

### Phase 1: Repository Structure & Monorepo Foundation
- **Goal:** Establish clean monorepo structure with Next.js frontend (`apps/web`) and FastAPI backend (`apps/api`).
- **Deliverables:**
  - Move/organize existing frontend code from `cartelnet-glassmorphism-ui-design` into `apps/web/`
  - Setup `apps/api/` with FastAPI, Pydantic, SQLAlchemy, and modular routers
  - Create root configuration (`docker-compose.yml`, shared environment templates)
  - Verify frontend dev server and API health check endpoint

### Phase 2: Ingestion Pipeline & Data Normalization
- **Goal:** Allow importing procurement datasets (CSV and synthetic demo dataset) into PostgreSQL.
- **Deliverables:**
  - Ingestion module in `apps/api/modules/ingestion`
  - Normalization services for companies, directors, registered addresses, tenders, and bids
  - Built-in synthetic demo dataset generator & seeder
  - Connect `apps/web/app/(app)/data/page.tsx` wizard to backend ingestion API

### Phase 3: Risk Detection Engine & Explainable Scoring
- **Goal:** Build the Python risk analytics subsystem with 5 core detectors and composite scoring.
- **Deliverables:**
  - Modular detector interface in `apps/api/modules/risk/detectors/`
  - Implement 5 detectors:
    1. `PriceClusteringDetector`
    2. `SharedDirectorDetector`
    3. `SharedAddressDetector`
    4. `RepeatedParticipationDetector`
    5. `HistoricalWinnerPatternDetector`
  - Configurable weighted scoring service generating 0–100 risk score and severity bands
  - Evidence attachment linking signals to source data records

### Phase 4: NetworkX Graph Projection & Interactive Visualization
- **Goal:** Project entity relationships into NetworkX and serve interactive graph queries to the UI.
- **Deliverables:**
  - Network module in `apps/api/modules/network` building relationship graphs
  - Graph query API returning nodes (Tender, Company, Director, Address) and edges
  - Connect Next.js `apps/web/app/(app)/network/page.tsx` and Tender 360 Network tab to live API
  - Entity inspection drawer with connected bids, win/loss stats, and risk signals

### Phase 5: Investigation Case Management & Report Generation
- **Goal:** Provide end-to-end case workflow for auditors and investigators.
- **Deliverables:**
  - Investigations module in `apps/api/modules/investigations`
  - Case creation from flagged tenders or company clusters
  - Investigator assignment, timestamped note logging, evidence reference linking
  - Structured investigation report export (Executive Summary, Evidence Log, Entity Dossier)
  - Connect `apps/web/components/investigations/workspace.tsx` to backend

### Phase 6: Multi-Tenant Auth, Golden Path Seeding & Final Verification
- **Goal:** Secure the platform, verify multi-tenant isolation, and execute the complete golden workflow.
- **Deliverables:**
  - Auth module (`apps/api/modules/auth`) with JWT sessions and RBAC roles
  - Organization onboarding (Government Authority vs Company)
  - End-to-end verification of the Golden Flow:
    `Login → Load Demo → Open Tender 360 → Run Risk Screen → Inspect Evidence Signals → Explore Network → Open Investigation → Generate Report`
