# CartelNet — Project State

## Current Position
- **Milestone:** Milestone 1 — CartelNet MVP
- **Active Phase:** Phase 2 (Ingestion Pipeline & Data Normalization) — ✅ COMPLETED
- **Next Phase:** Phase 3 (Risk Detection Engine & Explainable Scoring)

---

## Roadmap Status
| Phase | Name | Status |
|---|---|---|
| **Phase 1** | Repository Structure & Monorepo Foundation | ✅ Completed |
| **Phase 2** | Ingestion Pipeline & Data Normalization | ✅ Completed |
| **Phase 3** | Risk Detection Engine & Explainable Scoring | ⏳ Next Up |
| **Phase 4** | NetworkX Graph Projection & Interactive Visualization | ⏳ Pending |
| **Phase 5** | Investigation Case Management & Report Generation | ⏳ Pending |
| **Phase 6** | Multi-Tenant Auth, Golden Path Seeding & Final Verification | ⏳ Pending |

---

## Phase 2 Accomplishments
1. **Relational Models:** Complete SQLAlchemy models implemented across all domains:
   - `organizations` (`Organization`, `User`, `OrganizationMembership`)
   - `companies` (`Company`, `Director`, `CompanyDirector`, `Address`)
   - `tenders` (`Tender`)
   - `bids` (`Bid`)
   - `risk` (`RiskSignal`, `Evidence`)
   - `investigations` (`Investigation`, `InvestigationNote`)
   - `ingestion` (`ImportJob`, `ImportRecordError`)
2. **Normalization Engine:** Implemented entity normalization in `apps/api/app/modules/ingestion/normalization.py`:
   - Company name cleanup (strips legal suffixes: Ltd, LLC, Inc, Pvt Ltd, standardizes casing)
   - Director name cleanup (strips honorifics: Dr., Mr., Mrs.)
   - Address hashing and standardization
   - Monetary amount and ISO date parser
3. **Ingestion & Seeding Service:**
   - Multi-step validation service tracking valid rows, warning rows, and row-level errors.
   - Built-in benchmark procurement dataset seeder in `apps/api/app/modules/ingestion/service.py`.
4. **Realistic Benchmark Dataset:** Created `data/demo/tenders_procurement_benchmark.csv` featuring 17 realistic procurement bids, with embedded patterns for price clustering, shared directorships, shared addresses, and rotation.
5. **Testing Verification:** 8 backend unit and integration tests passing 100% in pytest (`test_health.py` and `test_ingestion.py`).
