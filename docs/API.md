# CartelNet REST API Specification

All API endpoints are prefixed with `/api/v1/` except the global health check at `/api/health`.

## 1. Global Endpoints
- `GET /api/health`
  - Response: `{"status": "ok", "app": "CartelNet API", "version": "1.0.0"}`

## 2. Master Module Endpoints

### `/api/v1/auth`
- `POST /register`: Organization and initial admin registration.
- `POST /login`: OAuth2 / JWT login returning access token.
- `GET /me`: Authenticated user profile and workspace permissions.

### `/api/v1/organizations`
- `GET /current`: Current organization profile and settings.
- `PATCH /settings`: Update risk rule weights and thresholds.

### `/api/v1/tenders`
- `GET /`: List tenders with pagination, filtering (status, risk, authority), search.
- `POST /`: Create or register tender.
- `GET /{id}`: Full Tender 360 data (overview, bids, signals, evidence, timeline).
- `POST /{id}/analyze`: Trigger on-demand risk screening and signal generation.

### `/api/v1/companies`
- `GET /`: Search and list companies.
- `GET /{id}`: Company dossier (bidding history, win/loss stats, directors, risk profile).

### `/api/v1/risk`
- `GET /signals`: Live risk signal stream across all tenders.
- `GET /rules`: Active detector rules, weights, and thresholds.
- `POST /evaluate`: Run dry-run screening against submitted bids.

### `/api/v1/network`
- `GET /graph`: Subgraph query returning nodes (tenders, companies, directors, addresses) and edges for React Flow visualization.
- `GET /clusters`: Identify dense co-bidding or shared-director clusters.

### `/api/v1/investigations`
- `GET /`: List investigation cases with status/priority filters.
- `POST /`: Create investigation case from tender or signal cluster.
- `GET /{id}`: Case details, assigned investigator, evidence links, notes.
- `POST /{id}/notes`: Add timestamped investigation note.
- `PATCH /{id}/status`: Update case status (`UNDER_REVIEW`, `ESCALATED`, `CLOSED`).

### `/api/v1/ingestion`
- `POST /upload`: Multipart CSV / Excel file upload and preliminary schema detection.
- `POST /validate`: Dry-run validation against expected columns.
- `POST /commit`: Commit valid records to PostgreSQL database.
- `POST /demo-seed`: Seed database with synthetic procurement test cases.

### `/api/v1/reports`
- `POST /generate`: Generate structured audit report (Tender Risk, Case Summary).
