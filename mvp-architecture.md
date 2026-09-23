# CartelNet MVP — Modular, Seamless, Prototype-First Architecture

## Design principle
Build a thin vertical slice that works end-to-end before adding enterprise infrastructure.

`Import → Normalize → Screen → Explain → Investigate`

Every stage is a replaceable module with a stable contract.

## MVP stack (recommended)
- **Frontend:** Next.js + TypeScript + React Query
- **UI:** existing Tailwind primitives + Lucide; optionally migrate to shadcn/ui
- **Graph UI:** React Flow
- **Charts:** Recharts
- **API:** FastAPI + Pydantic
- **System of record:** PostgreSQL
- **Risk analytics:** Python + Pandas/NumPy/scikit-learn + NetworkX
- **Auth:** keep JWT for the offline prototype; swap the provider later to Clerk/Auth0/Supabase Auth without changing feature modules
- **Files:** start with multipart upload; move to S3/Supabase Storage when deployed
- **Background jobs:** synchronous for MVP; add Inngest/Trigger.dev/Celery only for large files
- **Graph DB:** not required for MVP; use NetworkX + PostgreSQL first. Add Neo4j only when relationship volume makes it valuable.

## Why this is better for the hackathon
The previous stack forced the prototype to boot PostgreSQL + Redis + Neo4j even though the core demo only needs a relational store and graph computation. The MVP profile removes unnecessary moving pieces while preserving upgrade paths.

## Modular backend
`app/modules/<feature>/`
- auth
- tenders
- investigations
- ingestion
- network
- risk
- dashboard

Each module owns its router and domain logic. The API aggregator only mounts modules.

## Modular frontend
`features/<feature>/`
- dashboard
- tenders
- tender-detail
- investigations
- ingestion
- network

Page routes remain thin wrappers. Business UI lives in feature components, so the same workflow can be reused in modal, dashboard and mobile layouts.

## Upgrade path
### Prototype
Postgres + NetworkX + local uploads

### Demo deployment
Supabase Postgres/Auth/Storage or managed Postgres + Clerk + S3-compatible storage

### Production scale
Redis + Inngest/Trigger.dev/Celery, object storage, Neo4j GDS, OpenTelemetry, Sentry, RLS, SSO.

## One golden user flow
1. Sign in
2. Load demo or import CSV
3. Open tender
4. Run analysis
5. Inspect evidence signals
6. Explore network
7. Open review case

Do not build disconnected screens. Every screen must advance the same workflow.
