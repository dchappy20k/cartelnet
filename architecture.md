# CartelNet — System Architecture

**Version:** 1.0 MVP  
**Status:** Prototype / MVP  
**Product:** CartelNet  
**Architecture Style:** Modular monolith with replaceable infrastructure components  
**Primary Goal:** Build a seamless, explainable procurement-risk intelligence workflow without over-engineering the MVP.

---

## 1. Architecture Principles

CartelNet should follow these principles:

1. **Modular first** — each product capability is isolated behind clear interfaces.
2. **MVP simple** — use prebuilt technologies and avoid infrastructure that is not required for the prototype.
3. **API-first** — the frontend communicates through a typed backend API rather than directly coupling to database models.
4. **Explainability first** — every risk result must be traceable to signals and evidence.
5. **Human-in-the-loop** — the system recommends review; it does not make legal determinations.
6. **Tenant isolation** — organization data is isolated at the application and database layers.
7. **Upgrade without rewrite** — PostgreSQL, NetworkX, local storage and synchronous jobs can later be upgraded to managed or distributed components.
8. **One workflow** — ingestion, analysis, graph exploration and investigation operate on the same underlying procurement records.

---

## 2. High-Level Architecture

```text
                              CARTELNET
                                  │
                  ┌───────────────┴────────────────┐
                  │                                │
          Next.js Web App                    API Clients
                  │                                │
                  └───────────────┬────────────────┘
                                  │ HTTPS / JSON
                                  ▼
                         ┌───────────────────┐
                         │    FastAPI API    │
                         │ Auth / RBAC / API │
                         └─────────┬─────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
              Domain Modules   Risk Engine   Import Pipeline
                    │              │              │
                    └──────────────┼──────────────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │  PostgreSQL   │
                           │ System Record │
                           └───────┬───────┘
                                   │
                         Graph projection / query
                                   │
                                   ▼
                           ┌───────────────┐
                           │   NetworkX    │
                           │ Graph Engine  │
                           └───────┬───────┘
                                   │
                                   ▼
                           React Flow Graph

Optional future infrastructure:
Redis → Background jobs
Object storage → Uploaded files / reports
Neo4j → Large-scale graph workloads
Managed Auth / SSO → Enterprise authentication
```

The MVP intentionally avoids making Redis, Neo4j, Kafka, Kubernetes, or a separate microservice architecture mandatory.

---

## 3. Recommended MVP Technology Stack

### Frontend

- **Next.js + TypeScript** — application shell, routing and frontend runtime.
- **Tailwind CSS** — styling.
- **shadcn/ui** — reusable accessible UI primitives.
- **TanStack Query** — server-state fetching, caching and invalidation.
- **React Hook Form + Zod** — forms and validation.
- **React Flow** — relationship network visualization.
- **Recharts** — analytics and risk charts.
- **Lucide** — consistent icon system.

### Backend

- **FastAPI** — REST API.
- **Pydantic** — request/response validation.
- **SQLAlchemy** — database access and ORM.
- **Alembic** — schema migrations.
- **Pandas** — structured data processing.
- **NumPy** — numerical operations.
- **NetworkX** — MVP graph construction and analysis.

### Database

- **PostgreSQL** — canonical application and procurement data.

### Authentication

Implement a provider-agnostic authentication service so the MVP can use local email/password authentication while leaving an integration point for Clerk, Auth0, Supabase Auth, or enterprise SSO later.

### Deployment

MVP:

- Next.js deployment platform
- FastAPI container
- Managed PostgreSQL

Local development:

```text
Docker Compose
├── web
├── api
└── postgres
```

Future production infrastructure can add Redis, object storage and Neo4j without changing the core domain model.

---

## 4. Repository Structure

Use a modular monorepo rather than a collection of unrelated files.

```text
cartelnet/
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── verify/
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   ├── tenders/
│   │   │   │   └── [tenderId]/
│   │   │   ├── investigations/
│   │   │   │   └── [investigationId]/
│   │   │   ├── network/
│   │   │   ├── risk-monitor/
│   │   │   ├── data/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── navigation/
│   │   │   ├── data-table/
│   │   │   ├── risk/
│   │   │   ├── tender/
│   │   │   ├── investigation/
│   │   │   ├── network/
│   │   │   ├── charts/
│   │   │   └── feedback/
│   │   │
│   │   ├── features/
│   │   │   ├── dashboard/
│   │   │   ├── tenders/
│   │   │   ├── investigations/
│   │   │   ├── risk/
│   │   │   ├── network/
│   │   │   ├── ingestion/
│   │   │   └── reports/
│   │   │
│   │   └── lib/
│   │       ├── api/
│   │       ├── auth/
│   │       ├── query/
│   │       └── validation/
│   │
│   └── api/
│       └── app/
│           ├── main.py
│           ├── core/
│           │   ├── config.py
│           │   ├── security.py
│           │   ├── permissions.py
│           │   └── errors.py
│           │
│           ├── api/
│           │   ├── router.py
│           │   └── dependencies.py
│           │
│           ├── modules/
│           │   ├── auth/
│           │   ├── organizations/
│           │   ├── users/
│           │   ├── dashboard/
│           │   ├── tenders/
│           │   ├── companies/
│           │   ├── bids/
│           │   ├── risk/
│           │   ├── network/
│           │   ├── investigations/
│           │   ├── ingestion/
│           │   ├── reports/
│           │   ├── search/
│           │   └── audit/
│           │
│           ├── db/
│           │   ├── session.py
│           │   ├── base.py
│           │   └── migrations/
│           │
│           ├── models/
│           ├── schemas/
│           └── services/
│
├── packages/
│   ├── types/              # shared API/domain types
│   └── ui/                 # optional shared frontend primitives
│
├── data/
│   └── demo/
│
├── docs/
│   ├── architecture.md
│   └── api.md
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 5. Backend Modular Architecture

Use a **modular monolith**. Each module owns its route handlers, schemas, service logic and tests while using shared infrastructure.

### Module responsibilities

| Module | Responsibility |
|---|---|
| `auth` | Login, registration, verification, password reset, session/token lifecycle |
| `organizations` | Tenant/workspace management and organization onboarding |
| `users` | Users, roles and membership |
| `dashboard` | Aggregated workspace metrics and activity |
| `tenders` | Tender CRUD and Tender 360 data composition |
| `companies` | Company/entity records |
| `bids` | Bid records and bidder participation |
| `risk` | Risk detectors, scoring and evidence generation |
| `network` | Graph projection and relationship queries |
| `investigations` | Investigation lifecycle, notes, actions and case state |
| `ingestion` | File upload, validation, mapping, normalization and import |
| `reports` | Structured report generation |
| `search` | Cross-entity search |
| `audit` | Security-sensitive and workflow audit events |

Each module should expose a small service interface instead of allowing controllers to contain business logic.

---

## 6. Request Flow

Typical page request:

```text
Browser
  ↓
Next.js page / feature
  ↓
TanStack Query
  ↓
Typed API client
  ↓
FastAPI route
  ↓
Authentication dependency
  ↓
Authorization dependency
  ↓
Domain service
  ↓
Repository / database query
  ↓
Pydantic response schema
  ↓
JSON
  ↓
React UI
```

### Rule

Frontend components should never know database table names.

The browser consumes domain-oriented API responses such as:

```text
TenderSummary
TenderRiskSummary
RiskSignal
InvestigationSummary
NetworkGraph
```

rather than raw SQL/ORM objects.

---

## 7. Multi-Tenant Architecture

CartelNet is a SaaS product. Organization isolation is therefore a core architectural requirement.

### Tenant ownership

Primary tenant-owned entities include:

- users/memberships
- tenders
- companies where organization-scoped
- bids
- risk signals
- evidence
- investigations
- reports
- audit events

### Access path

Every authenticated request should resolve:

```text
User
 ↓
Organization Membership
 ↓
Role
 ↓
Resource Organization ID
 ↓
Authorization Decision
```

For MVP, enforce tenant isolation in application services. For a production implementation, add PostgreSQL Row Level Security as a second enforcement layer for sensitive tenant-owned tables.

---

## 8. Authentication & Authorization

### Authentication flow

```text
Register
  ↓
Create organization
  ↓
Create user membership
  ↓
Verify email
  ↓
Login
  ↓
Access token / secure session
  ↓
Workspace dashboard
```

### Roles

```text
Organization Admin
Procurement Officer
Analyst
Investigator
Viewer
```

### Authorization model

Use RBAC for MVP.

Example:

```text
Viewer
  → read permitted records

Analyst
  → read + analyze

Procurement Officer
  → read + analyze + procurement workflow actions

Investigator
  → investigation actions + reports

Organization Admin
  → user/workspace administration
```

Never enforce authorization only in the frontend.

---

## 9. Procurement Data Model

PostgreSQL is the system of record.

```text
Organization
    │
    ├── Users / Memberships
    │
    ├── Tenders
    │     │
    │     ├── Bids ─── Company
    │     │               │
    │     │               ├── Directors
    │     │               └── Address
    │     │
    │     ├── Risk Signals
    │     │       │
    │     │       └── Evidence
    │     │
    │     └── Investigations
    │
    └── Audit Events
```

Core tables:

```text
organizations
users
organization_memberships
companies
directors
company_directors
addresses
tenders
bids
risk_signals
evidence
investigations
investigation_notes
audit_events
imports
import_errors
reports
```

Use foreign keys and unique constraints to protect data integrity.

---

## 10. Data Ingestion Architecture

The ingestion pipeline is a key reusable subsystem.

```text
File Upload
    ↓
File Validation
    ↓
Column Detection
    ↓
Column Mapping
    ↓
Schema Validation
    ↓
Normalization
    ↓
Deduplication
    ↓
Entity Resolution Hooks
    ↓
Transactional Import
    ↓
Import Summary
```

### Input formats

MVP:

- CSV
- optional XLSX
- demo dataset

### Normalization examples

Company names:

```text
"ABC Infra Pvt. Ltd."
"ABC Infrastructure Private Limited"
```

should be normalized into a consistent internal representation while retaining the original source value.

### Import safety

- Validate file size and MIME type.
- Validate expected columns.
- Reject malformed records with row-level errors.
- Keep an import record and status.
- Avoid partial silent success.
- Store original source metadata.

---

## 11. Risk Engine Architecture

Risk detection is an independent domain subsystem.

```text
Normalized Procurement Data
            ↓
     Feature Extraction
            ↓
 ┌──────────┼───────────┐
 ↓          ↓           ↓
Price     Relationship  Historical
Signals   Signals       Signals
 ↓          ↓           ↓
 └──────────┼───────────┘
            ↓
     Signal Aggregator
            ↓
     Screening Scorer
            ↓
   Evidence-linked Result
```

### Detector interface

Each detector should conceptually implement:

```python
analyze(context) -> list[RiskSignal]
```

Example detectors:

```text
PriceClusteringDetector
SharedDirectorDetector
SharedAddressDetector
RepeatedParticipationDetector
HistoricalWinnerPatternDetector
```

Future detectors can be added without rewriting the risk engine.

### Risk signal structure

Each generated signal contains:

```text
id
tender_id
type
severity
confidence
score_contribution
summary
explanation
evidence_ids
created_at
```

### Scoring

The scorer combines independent signal contributions into a **screening score**.

The weights should be configuration-driven:

```text
risk_rules
  ├── detector
  ├── enabled
  ├── weight
  ├── threshold
  └── version
```

Every score should be reproducible from a saved rule configuration version.

---

## 12. Evidence Architecture

The evidence layer prevents the risk engine from becoming a black box.

```text
Risk Detector
     ↓
Signal
     ↓
Evidence References
     ↓
Source Record
     ↓
Human-readable explanation
```

Example:

```text
Signal:
PRICE_CLUSTERING

Observed:
Bid A = ₹10.20 Cr
Bid B = ₹10.18 Cr
Bid C = ₹10.17 Cr

Metric:
Bid separation threshold exceeded

Source:
Tender TN-2048 / Bid records 12, 13, 18
```

The system should distinguish:

- observed facts,
- derived metrics,
- risk signals,
- reviewer conclusions.

---

## 13. Graph Architecture

### MVP approach

Store source-of-truth relationships in PostgreSQL and build an in-memory NetworkX graph when graph analysis is needed.

```text
PostgreSQL records
       ↓
Graph Builder
       ↓
NetworkX Graph
       ↓
Graph metrics / traversal
       ↓
Serializable Graph DTO
       ↓
React Flow
```

### Example graph

```text
             Director D1
              /      \
             /        \
        Company A   Company C
             |          |
             |          |
          Bid A       Bid C
             \          /
              \        /
               Tender T1
```

### Graph DTO

The API should return a frontend-friendly structure:

```json
{
  "nodes": [],
  "edges": [],
  "focusNodeId": "company-1",
  "metadata": {}
}
```

### Future migration

When graph size or query complexity becomes too large:

```text
PostgreSQL
   ↓
CDC / synchronization
   ↓
Neo4j
   ↓
Graph Data Science
```

This is an infrastructure upgrade, not a domain rewrite.

---

## 14. Investigation Workflow Architecture

The investigation module consumes outputs from the risk engine but remains controlled by humans.

```text
Risk Signal
    ↓
Create Investigation
    ↓
Assign Owner
    ↓
Collect / Review Evidence
    ↓
Add Notes
    ↓
Request Review / Escalate
    ↓
Generate Report
    ↓
Close Investigation
```

Investigation status transitions should be explicit and validated.

Example:

```text
NEW
 ↓
UNDER_REVIEW
 ↓
WAITING
 ↓
ESCALATED
 ↓
CLOSED
```

Not every status needs to be used in every case.

---

## 15. Reporting Architecture

Reports should be generated from structured records rather than from UI screenshots.

```text
Investigation
    ↓
Evidence references
    ↓
Tender summary
    ↓
Risk signal summary
    ↓
Reviewer notes
    ↓
Report renderer
    ↓
PDF / structured export
```

For MVP, a server-side HTML-to-PDF or a lightweight PDF library can be used.

Future versions can use a dedicated reporting service.

---

## 16. API Structure

Base URL:

```text
/api/v1
```

### Auth

```http
POST /auth/register
POST /auth/login
POST /auth/verify-email
POST /auth/refresh
POST /auth/forgot-password
```

### Dashboard

```http
GET /dashboard/summary
GET /dashboard/activity
```

### Tenders

```http
GET /tenders
POST /tenders
GET /tenders/{id}
POST /tenders/{id}/analyze
GET /tenders/{id}/risk-signals
GET /tenders/{id}/network
GET /tenders/{id}/timeline
GET /tenders/{id}/evidence
```

### Investigations

```http
GET /investigations
POST /investigations
GET /investigations/{id}
PATCH /investigations/{id}
POST /investigations/{id}/notes
POST /investigations/{id}/actions
POST /investigations/{id}/report
```

### Imports

```http
POST /data/import
GET /data/import/{id}
GET /data/import/history
```

### Search

```http
GET /search?q={query}
```

---

## 17. Frontend Architecture

The frontend follows feature-based organization.

```text
app/
features/
components/
lib/
```

### `app/`

Handles routes and page composition.

### `features/`

Contains business-specific UI logic.

Example:

```text
tenders/
  components/
  hooks/
  queries.ts
  mutations.ts
  types.ts
```

### `components/`

Contains reusable visual components.

Examples:

```text
DataTable
RiskBadge
RiskMeter
EntityDrawer
NetworkGraph
EvidencePanel
InvestigationTimeline
```

### `lib/api/`

Contains typed API clients.

```text
auth.ts
tenders.ts
risk.ts
network.ts
investigations.ts
ingestion.ts
reports.ts
```

Frontend pages should not directly call `fetch()` throughout the component tree.

---

## 18. Frontend State Strategy

Separate state into three categories.

### Server state

Use TanStack Query for:

- tenders
- risk signals
- investigations
- dashboard metrics
- network data
- imports

### Local UI state

Use React state for:

- selected tab
- open drawer
- filters
- graph selection
- modal state

### Form state

Use React Hook Form + Zod for:

- registration
- tender creation
- investigation forms
- import mapping
- settings

Avoid a global state library unless the product develops a real cross-feature requirement.

---

## 19. UI / UX Architecture

CartelNet uses a restrained dark glassmorphism design.

### Visual layers

```text
Graphite background
      ↓
Ambient gradient
      ↓
Glass surfaces
      ↓
Content
      ↓
Focused state / semantic risk color
```

The glass effect should remain secondary to readability.

### Key reusable components

```text
AppShell
Sidebar
Topbar
GlassCard
MetricCard
RiskBadge
RiskMeter
DataTable
FilterBar
CommandMenu
EntityDrawer
EvidencePanel
NetworkGraph
Timeline
EmptyState
ErrorState
Skeleton
Toast
```

---

## 20. Search Architecture

MVP search can use PostgreSQL indexes with simple multi-entity queries.

```text
Query
 ↓
Search service
 ↓
Tenders + Companies + Investigations + Directors + Addresses
 ↓
Ranked results
```

Future scale:

- PostgreSQL full-text search
- Elasticsearch / OpenSearch only when necessary.

Do not introduce a separate search cluster for the MVP.

---

## 21. Background Jobs

### MVP

Small datasets can use synchronous analysis requests.

For longer processing, keep a service boundary:

```text
AnalysisService
```

Then migrate implementation to:

```text
Redis
  ↓
Celery / RQ / managed job runner
  ↓
Worker
```

without changing API semantics.

### Job states

```text
PENDING
RUNNING
SUCCEEDED
FAILED
```

Import and analysis records should persist job status so users can refresh the page without losing state.

---

## 22. File Storage

### MVP

Small demo files can use local development storage.

### Production direction

Use S3-compatible object storage for:

- uploaded procurement documents
- original import files
- generated reports
- evidence attachments

Database stores metadata and object references, not large binary files.

---

## 23. Security Architecture

### Required controls

- TLS in deployment.
- Secure password hashing.
- Server-side authorization.
- Tenant isolation.
- Input validation.
- File upload validation.
- Request size limits.
- Rate limiting for authentication endpoints.
- Secure cookie/session strategy if cookie auth is used.
- No secrets in source control.
- Audit logs for sensitive actions.

### Sensitive workflow

```text
Authentication
   ↓
Authorization
   ↓
Resource access
   ↓
Business action
   ↓
Audit event
```

---

## 24. Audit Architecture

Every meaningful security/workflow action should be recordable.

Example event:

```json
{
  "actor_id": "user-123",
  "organization_id": "org-123",
  "action": "INVESTIGATION_CREATED",
  "resource_type": "investigation",
  "resource_id": "inv-1024",
  "metadata": {},
  "timestamp": "..."
}
```

Audit events should not be editable through normal application workflows.

---

## 25. Error Handling

API responses should use a consistent error structure.

Example:

```json
{
  "error": {
    "code": "IMPORT_VALIDATION_FAILED",
    "message": "The uploaded file contains invalid tender records.",
    "details": []
  }
}
```

Frontend converts these into user-friendly states.

Never expose stack traces, SQL errors, or internal implementation details to end users.

---

## 26. Observability

### MVP

Include:

- application logs
- API request logging in development
- health endpoint
- import/analysis status logging

### Production direction

Add:

- error monitoring
- structured logs
- metrics
- tracing where required
- uptime monitoring

Suggested health endpoints:

```http
GET /health
GET /ready
```

---

## 27. Configuration

All environment-specific configuration must be externalized.

Example:

```env
APP_ENV=development
API_BASE_URL=http://localhost:8000
DATABASE_URL=postgresql://...
JWT_SECRET=...
CORS_ORIGINS=http://localhost:3000
STORAGE_BUCKET=...
```

Never commit real secrets.

---

## 28. API Versioning Strategy

Start with:

```text
/api/v1
```

Prefer additive changes.

If a breaking change becomes necessary:

```text
/api/v2
```

This keeps the frontend and future integrations stable.

---

## 29. Testing Strategy

### Backend

- unit tests for risk detectors
- unit tests for normalization
- service tests for investigations
- API integration tests
- authorization tests
- tenant-isolation tests

### Frontend

- component tests for reusable UI
- feature tests for forms
- API mocking tests
- end-to-end test for the core journey

### Critical E2E test

```text
Login
 → Load demo data
 → Open tender
 → Analyze tender
 → View signals
 → Open network
 → Create investigation
 → Add note
 → Generate report
```

---

## 30. CI/CD

Minimal pipeline:

```text
Git Push
   ↓
Lint
   ↓
Type Check
   ↓
Frontend Build
   ↓
Backend Tests
   ↓
API Integration Tests
   ↓
Deploy
```

Suggested tools:

- GitHub
- GitHub Actions
- Docker
- chosen frontend hosting
- chosen container hosting
- managed PostgreSQL

---

## 31. Local Development

Recommended command:

```bash
docker compose up --build
```

Expected services:

```text
web     → http://localhost:3000
api     → http://localhost:8000
swagger → http://localhost:8000/docs
postgres → localhost:5432
```

Database migrations:

```bash
alembic upgrade head
```

Seed demo data:

```bash
python -m app.seed_demo
```

---

## 32. Demo Data Flow

The hackathon/demo environment should provide a one-click path:

```text
Load Demo Dataset
       ↓
Create synthetic tender records
       ↓
Create companies/directors/addresses
       ↓
Create bids
       ↓
Run risk detectors
       ↓
Create signals + evidence
       ↓
Build relationship graph
       ↓
Open dashboard
```

All demo data must remain explicitly labeled as synthetic.

---

## 33. Prototype-to-Production Upgrade Path

### Stage 1 — MVP

```text
Next.js
FastAPI
PostgreSQL
NetworkX
Synchronous analysis
Local/demo storage
```

### Stage 2 — Production beta

```text
Next.js
FastAPI
PostgreSQL
Redis
Background workers
Object storage
Managed authentication
Observability
```

### Stage 3 — Scale

```text
Next.js
FastAPI services
PostgreSQL
Redis
Object storage
Neo4j / graph analytics
External data connectors
Enterprise SSO
Advanced monitoring
```

The domain layer should remain stable throughout these stages.

---

## 34. Architecture Decision: Modular Monolith vs Microservices

### Decision

Use a **modular monolith** for CartelNet MVP.

### Why

The initial product requires tightly connected workflows:

```text
Tender
 → Risk
 → Evidence
 → Network
 → Investigation
 → Report
```

Splitting these into microservices too early would introduce:

- more deployments,
- network failure modes,
- duplicated schemas,
- complicated local development,
- more operational overhead.

The module boundaries are designed so that a future high-load module can be extracted later if justified.

---

## 35. Architecture Decision: PostgreSQL First

### Decision

Use PostgreSQL as the source of truth and NetworkX for MVP graph analysis.

### Why

The product is primarily relational:

- organizations,
- users,
- tenders,
- bids,
- companies,
- signals,
- evidence,
- investigations.

Graph visualization is important, but an enterprise graph database is not required to prove the MVP workflow.

---

## 36. Architecture Decision: Deterministic Risk Engine

The MVP should not rely on an LLM to decide whether a tender is risky.

Core detection must be deterministic and explainable.

```text
Structured data
     ↓
Rules / statistical detectors
     ↓
Risk signals
     ↓
Evidence
```

AI/LLM components may be added later for:

- document extraction,
- natural-language explanations,
- investigator assistance,
- summarization.

Any AI explanation must remain tied to the underlying evidence and clearly distinguish generated explanation from source records.

---

## 37. Core End-to-End Sequence

```text
┌──────────────┐
│    User      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Login/Auth   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Dashboard  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Load / Import│
│ Procurement  │
│ Data         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Normalize +  │
│ Validate     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Risk Engine  │
└──────┬───────┘
       │
       ├─────────────┐
       ▼             ▼
┌────────────┐ ┌─────────────┐
│ Signals    │ │ Evidence    │
└─────┬──────┘ └──────┬──────┘
      │               │
      └───────┬───────┘
              ▼
       ┌──────────────┐
       │   Network    │
       │   Analysis   │
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │ Investigation│
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │    Report    │
       └──────────────┘
```

---

## 38. Core Architectural Contract

CartelNet's architecture should preserve the following contract:

```text
DATA
  → STRUCTURE
  → ANALYZE
  → EXPLAIN
  → INVESTIGATE
  → REPORT
```

The user should be able to move through this entire chain without leaving the product or manually rebuilding context between screens.

The architecture should optimize for that **seamless workflow first**, while keeping each stage modular enough to evolve independently.
