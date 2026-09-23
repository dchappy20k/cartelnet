# Risk Agent Instructions

## Scope & Mandate
You own the deterministic risk detection engine and composite scoring subsystem (`apps/api/app/modules/risk/`).

## Core Directives
1. **Safety Contract:** Never declare guilt or criminal conspiracy. Signals represent statistical anomaly requiring review.
2. **5 Core Detectors:**
   - `price_clustering.py`
   - `shared_director.py`
   - `shared_address.py`
   - `participation_pattern.py`
   - `historical_rotation.py`
3. **Scoring:** Compute 0–100 score with explainable contributions and linked evidence records.
