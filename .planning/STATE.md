# CartelNet — Project State

## Current Position
- **Milestone:** Milestone 1 — CartelNet MVP
- **Active Phase:** Phase 3 (Risk Detection Engine & Explainable Scoring) — ✅ COMPLETED
- **Next Phase:** Phase 4 (NetworkX Graph Projection & Interactive Visualization)

---

## Roadmap Status
| Phase | Name | Status |
|---|---|---|
| **Phase 1** | Repository Structure & Monorepo Foundation | ✅ Completed |
| **Phase 2** | Ingestion Pipeline & Data Normalization | ✅ Completed |
| **Phase 3** | Risk Detection Engine & Explainable Scoring | ✅ Completed |
| **Phase 4** | NetworkX Graph Projection & Interactive Visualization | ⏳ Next Up |
| **Phase 5** | Investigation Case Management & Report Generation | ⏳ Pending |
| **Phase 6** | Multi-Tenant Auth, Golden Path Seeding & Final Verification | ⏳ Pending |

---

## Phase 3 Accomplishments
1. **Deterministic Detector Subsystem:** Implemented 5 modular risk detectors in `apps/api/app/modules/risk/detectors/`:
   - `PriceClusteringDetector` (`PRICE_CLUSTERING`): Coefficient of variation ($CV \le 1.5\%$) and narrow spread detection.
   - `SharedDirectorDetector` (`SHARED_DIRECTORS`): Pairwise director intersection across competing bidders.
   - `SharedAddressDetector` (`SHARED_ADDRESS`): Physical registration address and cluster hash collisions.
   - `RepeatedParticipationDetector` (`REPEATED_PARTICIPATION`): High-frequency joint co-bidding patterns across multiple tenders.
   - `HistoricalWinnerPatternDetector` (`HISTORICAL_ROTATION`): Systematic alternating winner patterns (bid rotation).
2. **Composite Scoring Engine:** Implemented weighted scoring formula in `scoring.py`:
   - Configurable base detector weights (15 to 35 pts) and severity multipliers (0.5 to 1.25).
   - Generates 0–100 composite risk score and severity bands (`low`, `medium`, `high`, `critical`).
3. **Evidence Persistence & Safety Contracts:**
   - Every detected signal automatically persists underlying `Evidence` with JSON payloads (e.g. director names, bid amounts, CV%, co-bidding tender IDs).
   - Enforced non-negotiable safety rules: No claims of legal guilt; all signals use "Risk Signal", "Elevated Risk", "Requires Human Review".
4. **API Endpoints:**
   - `POST /api/v1/risk/tenders/{tender_id}/screen`
   - `POST /api/v1/risk/screen-all`
   - `GET /api/v1/risk/signals`
   - `GET /api/v1/risk/rules`
5. **Testing Verification:**
   - **11/11 tests passing 100% in pytest** across health, ingestion, and risk engine modules.
   - Verified that `TND-8842` triggers Price Clustering, Shared Directorship, and Shared Address ($Score \ge 70$, Critical), while clean control `TND-8790` scores 0 (Low).
6. **Knowledge Graph Updated:** Indexed **598 nodes** and **1,143 edges** across **59 communities** in `.planning/graphs/graph.html`.
