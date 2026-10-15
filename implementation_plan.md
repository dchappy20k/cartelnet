# Implementation Plan — Phase 4: NetworkX Graph Projection & Interactive Visualization

Transform relational procurement records into an in-memory NetworkX entity graph and serve interactive graph queries to the CartelNet Next.js frontend, enabling investigators to visually detect director overlaps, shared physical addresses, and co-bidding patterns.

---

## User Review Required

> [!NOTE]
> - **In-Memory Graph Engine:** We will project the relational database entities (`Tender`, `Company`, `Director`, `Address`, `Bid`) into a NetworkX `MultiDiGraph` or `Graph` dynamically with caching per tenant/tender.
> - **Node & Edge Types:**
>   - **Nodes:** `Tender`, `Company`, `Director`, `Address` (with optional `Bid` / `Subcontractor`).
>   - **Edges:** `bids_on` (Company -> Tender), `director_of` (Director -> Company), `registered_at` (Company -> Address), `co_bidder` (Company <-> Company), `shared_director` (Company <-> Company).
> - **Layout Algorithm:** NetworkX 2D layout calculation (scaled force-directed / spring layout coordinates normalized to 800x500 viewport) so the frontend SVG graph renders nodes at optimal, collision-reduced positions dynamically.
> - **Frontend Integration:** Connect `apps/web/app/(app)/network/page.tsx` and `components/network/graph.tsx` to the FastAPI backend API `/api/v1/network/graph` and `/api/v1/network/tenders/{id}/graph` with automatic fallback to local demo dataset if the API is offline.

---

## Proposed Changes

### Backend: Graph Service & Network Module (`apps/api/app/modules/network`)

#### [MODIFY] [apps/api/app/modules/network/schemas.py](file:///c:/cartelnet/apps/api/app/modules/network/schemas.py)
Define Pydantic models for graph representation:
- `NodeType`: Literal['tender', 'company', 'director', 'address', 'bid']
- `GraphNode`: `id`, `label`, `type`, `x`, `y`, `companyId` (optional), `risk` (optional), `metadata` (dict)
- `GraphEdge`: `source`, `target`, `label`, `weight` (optional), `relationship_type`
- `GraphResponse`: `nodes: list[GraphNode]`, `edges: list[GraphEdge]`, `summary: dict`
- `ClusterResponse`: list of identified dense clusters (companies sharing addresses, directors, or high co-bidding frequency)
- `CompanyDossierResponse`: company summary, total bids, won tenders, win rate, connected directors, shared address, associated risk signals

#### [MODIFY] [apps/api/app/modules/network/service.py](file:///c:/cartelnet/apps/api/app/modules/network/service.py)
Implement `NetworkService`:
- `build_global_graph(db: Session, tenant_id: str) -> nx.Graph`:
  - Query tenders, bids, companies, company_directors, directors, addresses.
  - Add nodes with attributes (type, label, risk level, legal name).
  - Add edges: `Company` -> `Tender` (`bids_on`), `Director` -> `Company` (`director_of`), `Company` -> `Address` (`registered_at`).
  - Compute force-directed 2D positions (`nx.spring_layout`) scaled to 800x500 SVG coordinates.
- `build_tender_subgraph(db: Session, tender_id: str, tenant_id: str) -> nx.Graph`:
  - Extract the ego-graph / k-hop neighborhood centered on the given tender.
  - Include participating bidders, their shared directors, shared addresses, and co-bidding edges.
- `detect_clusters(db: Session, tenant_id: str) -> list[dict]`:
  - Project company-to-company relationships (shared directors, shared address, co-bidding).
  - Compute connected components and community clusters.
- `get_company_dossier(db: Session, company_id: str, tenant_id: str) -> dict`:
  - Calculate win/loss statistics, total bidding value, connected directors, co-bidders, and related risk signals.

#### [MODIFY] [apps/api/app/modules/network/router.py](file:///c:/cartelnet/apps/api/app/modules/network/router.py)
Expose REST API endpoints:
- `GET /api/v1/network/graph`: Get full or filtered relationship graph.
- `GET /api/v1/network/tenders/{tender_id}/graph`: Get focused subgraph for a specific tender.
- `GET /api/v1/network/clusters`: Get detected entity clusters.
- `GET /api/v1/network/companies/{company_id}/dossier`: Get company profile dossier.

---

### Frontend: Live API Integration (`apps/web`)

#### [NEW] [apps/web/lib/api-client.ts](file:///c:/cartelnet/apps/web/lib/api-client.ts)
Type-safe HTTP client with configured `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`) and graceful fallback mechanisms for local resilience.

#### [MODIFY] [apps/web/app/(app)/network/page.tsx](file:///c:/cartelnet/apps/web/app/(app)/network/page.tsx)
- Add tender selector / filter dropdown (e.g. `TND-8842 - Highway Resurfacing`, `TND-8817 - Water Treatment`, `TND-8790 - Hospital IT`, or `All Entities`).
- Fetch live graph data from `GET /api/v1/network/tenders/{id}/graph` or `GET /api/v1/network/graph`.
- Show live entity and link counts in the badge.
- Pass live graph data to `NetworkGraph`.

#### [MODIFY] [apps/web/components/network/graph.tsx](file:///c:/cartelnet/apps/web/components/network/graph.tsx)
- Support receiving dynamic `nodes` and `edges` props with fallback to `graph-data.ts`.
- Dynamically render nodes and edges according to calculated coordinates and node styles.

#### [MODIFY] [apps/web/components/network/company-drawer.tsx](file:///c:/cartelnet/apps/web/components/network/company-drawer.tsx)
- Fetch real company dossier from `GET /api/v1/network/companies/{id}/dossier` when a company node is clicked.
- Display actual win rate, connected directors, registered address, and risk signals.

---

### Automated Tests (`apps/api/tests/test_network.py`)

#### [NEW] [apps/api/tests/test_network.py](file:///c:/cartelnet/apps/api/tests/test_network.py)
Pytest test suite covering:
1. `test_build_global_graph`: Verifies all companies, tenders, directors, and addresses are projected into NetworkX graph.
2. `test_tender_subgraph`: Verifies `TND-8842` subgraph contains its 3 bidders, shared director, and shared address.
3. `test_network_graph_endpoint`: Verifies `GET /api/v1/network/graph` returns 200 with formatted nodes and edges.
4. `test_tender_graph_endpoint`: Verifies `GET /api/v1/network/tenders/{tender_id}/graph` returns targeted subgraph.
5. `test_clusters_endpoint`: Verifies `GET /api/v1/network/clusters` detects collusive/shared director clusters.
6. `test_company_dossier_endpoint`: Verifies `GET /api/v1/network/companies/{company_id}/dossier` returns accurate stats and risk signals.

---

## Verification Plan

### Automated Tests
Run pytest in `apps/api`:
```powershell
c:\cartelnet\apps\api\.venv\Scripts\pytest.exe apps/api/tests -v
```
All existing tests (11) plus new network tests must pass (100% pass rate).

### Build Verification
Run frontend build to ensure zero TypeScript/lint errors:
```powershell
cd c:\cartelnet\apps\web
npm run build
```
Verify all routes compile cleanly.
