# CartelNet — System Requirements (MVP)

## 1. Authentication & Multi-Tenancy (AUTH / ORG)
- **REQ-AUTH-01:** User registration and login with email and password.
- **REQ-AUTH-02:** Organization onboarding supporting two organization types: *Government / Public Authority* and *Construction / Infrastructure Company*.
- **REQ-AUTH-03:** Role-Based Access Control (RBAC) with roles: `Organization Admin`, `Procurement Officer`, `Compliance Analyst`, `Investigator`, `Viewer`.
- **REQ-ORG-01:** Multi-tenant workspace data isolation. All queries and domain operations must be scoped to the authenticated organization.

## 2. Procurement Data Ingestion (ING)
- **REQ-ING-01:** Multi-step ingestion wizard (Select Source → Upload CSV → Map Columns → Validation → Screen & Analyze).
- **REQ-ING-02:** CSV file upload with validation of required fields (`tender_ref`, `authority_name`, `contract_value`, `num_bidders`, `bidder_names`, `bid_amounts`).
- **REQ-ING-03:** Validation reporting row counts: Total Rows, Valid Rows, Warnings, and Validation Errors.
- **REQ-ING-04:** Built-in synthetic demo dataset loader for instant demonstration without external file requirements.
- **REQ-ING-05:** Entity normalization for company names, registration IDs, director names, and registered addresses.

## 3. Risk Detection & Scoring Engine (RISK)
- **REQ-RISK-01:** Modular detector interface: `analyze(context) -> list[RiskSignal]`.
- **REQ-RISK-02:** Detector A — **Bid-Price Clustering**: Detect unusually narrow variance/separation among submitted bids compared to expected historical variance.
- **REQ-RISK-03:** Detector B — **Shared Directorship**: Detect multiple bidding companies in the same tender sharing current or recent directors.
- **REQ-RISK-04:** Detector C — **Shared Registered Address**: Detect bidding entities sharing the same physical registration address.
- **REQ-RISK-05:** Detector D — **Repeated Participation**: Detect pairs or groups of companies repeatedly bidding together across multiple tenders.
- **REQ-RISK-06:** Detector E — **Historical Winner Pattern**: Detect suspicious alternating wins / rotation patterns across historical awards.
- **REQ-RISK-07:** Configurable composite scoring engine calculating 0–100 risk score and assigning risk bands (`Low`, `Medium`, `High`, `Critical`).
- **REQ-RISK-08:** Explainability constraint: Every calculated score must link to individual signals, source records, and confidence scores.

## 4. Tender 360 & Procurement Overview (TND / DASH)
- **REQ-DASH-01:** Procurement overview dashboard with KPIs (Active Tenders, High-Risk Tenders, Open Cases, Signals Detected), risk trends chart, and Attention Required table.
- **REQ-TND-01:** Tender directory with search, filtering by risk level, status, authority, and value.
- **REQ-TND-02:** Tender 360 view with 7 operational tabs: Overview, Bidders, Risk Signals, Network, Timeline, Evidence, and Investigation.

## 5. Entity Relationship Network Graph (NET)
- **REQ-NET-01:** Graph data model with node types (`Tender`, `Company`, `Director`, `Address`) and edge types (`Submitted Bid`, `Won`, `Shares Director`, `Shares Address`).
- **REQ-NET-02:** Interactive graph rendering supporting node selection, edge highlighting, zoom, and entity details side panel.
- **REQ-NET-03:** Backend graph projection using NetworkX to identify connected components, cliques, and relationship paths.

## 6. Investigation & Case Management (INV)
- **REQ-INV-01:** Create investigation cases linked to flagged tenders or suspicious entity clusters.
- **REQ-INV-02:** Case lifecycle management: statuses (`New`, `Under Review`, `Waiting`, `Escalated`, `Closed`) and priorities (`Low`, `Medium`, `High`).
- **REQ-INV-03:** Investigation actions: assign investigator, add timestamped notes, attach evidence references, and change status.
- **REQ-INV-04:** Audit report generation: Export case summary, findings, evidence logs, and entity network summary.

## 7. Non-Functional & Security Requirements (NFR)
- **REQ-NFR-01:** Performance: Tender risk screening of 1,000 bids completes in under 3 seconds.
- **REQ-NFR-02:** Security: Secrets managed via environment variables (`.env` excluded from version control).
- **REQ-NFR-03:** Disclaimers: Prominent ethical disclaimer in UI stating that signals indicate risk requiring human review, not legal proof of wrongdoing.
