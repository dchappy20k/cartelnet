# CartelNet Risk Engine Architecture

## 1. Design & Separation of Concerns
The Risk Engine is an independent, deterministic analytics subsystem. It executes detection algorithms against normalized procurement records to identify potential coordination patterns.

### Core Safety Contract
- ⚠️ Detectors NEVER declare legal guilt, conspiracy, or crime.
- Every signal outputs:
  - `detector_code`
  - `severity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `confidence` (0.0 to 1.0)
  - `score_contribution`
  - `summary`
  - `explanation`
  - `evidence_items`

## 2. Core Detectors (MVP)

### 1. `PriceClusteringDetector` (`PRICE_CLUSTERING`)
- **Premise:** Competitive markets produce variance in pricing reflecting differing cost structures. Tight price clustering (e.g. coefficient of variation < 1.5%) suggests possible information exchange or formula-based cover bidding.
- **Input:** Bids for a given tender.
- **Metric:** Coefficient of variation ($CV = \sigma / \mu$) and relative spread.

### 2. `SharedDirectorDetector` (`SHARED_DIRECTOR`)
- **Premise:** Companies submitting competing bids for the same contract sharing executive directors or beneficial owners violates genuine independence.
- **Input:** Companies bidding on the same tender, cross-referenced with `company_directors`.
- **Output:** Exact shared director IDs, names, and appointment terms.

### 3. `SharedAddressDetector` (`SHARED_ADDRESS`)
- **Premise:** Competing bidders sharing registered offices or operational physical addresses.
- **Input:** Registered addresses of bidders in the same tender.

### 4. `RepeatedParticipationDetector` (`REPEATED_PARTICIPATION`)
- **Premise:** Pairs or cliques of companies repeatedly bidding together across multiple tenders with disproportionate frequency.
- **Input:** Historical tender participation records.

### 5. `HistoricalWinnerPatternDetector` (`HISTORICAL_ROTATION`)
- **Premise:** Bidders systematically alternating winning bids across geographical regions or customer authorities.
- **Input:** Historical award history across multiple contracts.

## 3. Weighted Scoring Engine
$$Score = \min\left(100, \sum_{i} w_i \times \text{signal}_i.\text{confidence} \times \text{severity\_multiplier}\right)$$

### Risk Bands
- `0 - 29`: **Low**
- `30 - 59`: **Medium**
- `60 - 84`: **High**
- `85 - 100`: **Critical**
