# Phase 2: Ingestion Pipeline & Data Normalization — Plan

## Goal
Build the end-to-end data ingestion and normalization pipeline. Allow ingesting structured procurement datasets (CSV uploads and realistic synthetic/benchmark datasets) into the PostgreSQL/SQLite database with entity resolution (companies, directors, addresses, tenders, bids) ready for deterministic risk scoring and graph queries.

---

## Deliverables

### 1. Database ORM Models
Implement concrete SQLAlchemy models in `apps/api/app/modules/`:
- `organizations/models.py`: `Organization`, `User`, `OrganizationMembership`
- `companies/models.py`: `Company`, `Director`, `CompanyDirector`, `Address`
- `tenders/models.py`: `Tender`
- `bids/models.py`: `Bid`
- `risk/models.py`: `RiskSignal`, `Evidence`
- `investigations/models.py`: `Investigation`, `InvestigationNote`
- `ingestion/models.py`: `ImportJob`, `ImportRecordError`

### 2. Normalization Engine (`apps/api/app/modules/ingestion/normalization.py`)
- Clean company names (strip legal suffixes: Ltd, LLC, Inc, Corp, Pvt Ltd; trim; lowercase search tokens).
- Normalize director names.
- Address normalization (hashing standardized strings for rapid clustering).
- Monetary amount and ISO date parser with error resilience.

### 3. Ingestion Service (`apps/api/app/modules/ingestion/service.py`)
- Multi-step validation: detect headers, validate required columns, dry-run schema check.
- Deduplication and entity resolution: lookup existing company by normalized name or tax ID; link existing address/director.
- Transactional database insertion.

### 4. Benchmark Procurement Dataset (`data/demo/tenders_procurement_benchmark.csv`)
- High-quality benchmark dataset covering:
  - Clean competitive tenders (low risk baseline)
  - Price clustering test cases (spread < 1.5%)
  - Shared directorship test cases
  - Shared registered address test cases
  - Co-bidding rotation test cases
- Built-in seeder service (`demo_seed()`).

### 5. API Endpoints (`apps/api/app/modules/ingestion/router.py`)
- `POST /api/v1/ingestion/upload`: upload CSV, parse headers and sample rows.
- `POST /api/v1/ingestion/validate`: check mapped columns, return row stats (valid, warnings, errors).
- `POST /api/v1/ingestion/commit`: execute ingestion transaction into database.
- `POST /api/v1/ingestion/demo-seed`: seed the benchmark dataset.
- `GET /api/v1/ingestion/history`: list previous import jobs.

### 6. Automated Verification
- Pytest suite in `apps/api/tests/test_ingestion.py` testing normalization, CSV validation, entity resolution, and demo seeding.
