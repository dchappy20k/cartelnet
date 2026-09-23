# Phase 3: Risk Detection Engine & Explainable Scoring — Plan

## Goal
Implement the deterministic risk detection subsystem and composite scoring engine in `apps/api/app/modules/risk/`. Detect statistical pricing anomalies, executive cross-ties, location overlaps, and rotational bidding patterns across procurement tenders with explainable, evidence-backed signals.

---

## Deliverables

### 1. Detector Architecture (`apps/api/app/modules/risk/detectors/`)
- `base.py`: Base detector abstract class defining input context, safety contracts, and output schema.
- `price_clustering.py`: Coefficient of variation and narrow price spread detection.
- `shared_director.py`: Pairwise executive and director intersection across competing bidders.
- `shared_address.py`: Physical address and cluster hash collision across bidders.
- `participation_pattern.py`: High-frequency co-bidding clique detection.
- `historical_rotation.py`: Alternating winner patterns across sequential contracts.

### 2. Scoring & Aggregation Engine (`apps/api/app/modules/risk/scoring.py`)
- Configurable detector weights:
  - Price clustering: 25 pts
  - Shared directorship: 35 pts
  - Shared address: 20 pts
  - Bid rotation: 25 pts
  - Repeated co-bidding: 15 pts
- Composite 0–100 score calculation and risk level assignment (`low`, `medium`, `high`, `critical`).

### 3. Risk Service & Repository (`service.py` & `repository.py`)
- Screen tender by ID: loads bids, entities, historical context; runs detectors; persists `RiskSignal` and `Evidence` records; updates `Tender` record.
- Bulk screen: screens all tenders in organization.
- Fetch signals and evidence items.

### 4. Risk Router (`apps/api/app/modules/risk/router.py`)
- `POST /api/v1/risk/tenders/{tender_id}/screen`
- `POST /api/v1/risk/screen-all`
- `GET /api/v1/risk/tenders/{tender_id}/signals`
- `GET /api/v1/risk/signals`
- `GET /api/v1/risk/rules`

### 5. Automated Verification
- Pytest suite in `apps/api/tests/test_risk_engine.py` testing each detector independently and running full screening against the benchmark dataset (`data/demo/tenders_procurement_benchmark.csv`).
