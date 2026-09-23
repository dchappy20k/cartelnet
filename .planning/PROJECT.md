# CartelNet — Project Context

## Project Overview
**Product:** CartelNet  
**Category:** Procurement Risk Intelligence SaaS  
**Version:** 1.0 MVP  
**Tagline:** *Detect procurement risk. Understand the evidence. Act before public money is exposed.*

CartelNet analyzes tender, bidder, company, director, registered address, and historical bidding data to identify suspicious procurement-risk signals (collusion, price clustering, bid rotation, shared directorships) and organizes the supporting evidence into a structured human-review workflow.

> **Core Principle:** CartelNet is a risk detection and decision-support platform, not a legal or law-enforcement engine. It highlights anomalous patterns and provides evidence for human review without declaring guilt.

---

## The Golden Workflow
```
Import → Normalize → Screen → Explain → Investigate
```
1. **Import / Ingest:** Ingest procurement data via CSV, Excel, or synthetic demo dataset.
2. **Normalize:** Reconcile entity records (companies, directors, addresses, tenders, bids).
3. **Screen:** Execute explainable detector algorithms to compute a composite risk score.
4. **Explain:** Present every signal with underlying evidence, source data, and relationship network graph.
5. **Investigate:** Allow compliance analysts / investigators to open cases, assign owners, log notes, and export audit reports.

---

## Technical Architecture & Stack

### Architecture Style
Modular Monolith with clean separation between `apps/web` (Next.js) and `apps/api` (FastAPI):
- **Frontend (`apps/web`):**
  - Next.js 16 (App Router) + React 19 + TypeScript
  - Tailwind CSS v4 + Glassmorphism dark aesthetic
  - Recharts for risk trends & metrics
  - Interactive SVG / React Flow entity relationship network graph
  - Lucide icons & glassmorphic UI components (already prototyped in `cartelnet-glassmorphism-ui-design`)
- **Backend (`apps/api`):**
  - FastAPI + Pydantic v2
  - SQLAlchemy 2.0 + Alembic (PostgreSQL)
  - Modular domain architecture (`auth`, `organizations`, `tenders`, `companies`, `bids`, `risk`, `network`, `investigations`, `ingestion`, `reports`)
- **Risk & Graph Engine:**
  - NetworkX + Pandas + NumPy
  - Modular detectors: `PriceClusteringDetector`, `SharedDirectorDetector`, `SharedAddressDetector`, `RepeatedParticipationDetector`, `HistoricalWinnerPatternDetector`
  - Scoring engine with configurable rule weights
- **Database & Storage:**
  - PostgreSQL (system of record)
  - Multi-tenant isolation at application service layer (and future RLS)

---

## Key Personas & Roles
- **Procurement Officer:** Monitors tenders, reviews incoming signals, routes tenders for review.
- **Auditor / Compliance Analyst:** Deep-dives into evidence, historical participation patterns, and network ties.
- **Investigator:** Owns cases, attaches evidence, records findings, and exports audit reports.
- **Organization Admin:** Manages users, workspaces, and system settings.
- **Company User:** Read-only compliance view of own bids and participation without access to government investigation tools.

---

## Existing Assets in Repository
- `architecture.md`: 1500+ line technical architecture specification
- `prd.md`: 1100+ line product requirements document
- `mvp-architecture.md`: Hackathon & prototype-first architectural guidelines
- `cartelnet-glassmorphism-ui-design/`: Complete Next.js 16 glassmorphic frontend implementation
