import pytest
from app.core.security import create_access_token
from app.core.config import DEFAULT_ORG_ID


@pytest.fixture
def auth_headers():
    token = create_access_token(
        subject="investigator-test",
        organization_id=DEFAULT_ORG_ID,
        role="INVESTIGATOR",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def seed_benchmark(client):
    """Seed benchmark dataset before running graph intelligence tests."""
    client.post("/api/v1/ingestion/demo-seed")


def test_global_graph_generation(client, auth_headers):
    res = client.get("/api/v1/network/graph", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert "nodes" in data
    assert "edges" in data
    assert "summary" in data

    nodes = data["nodes"]
    edges = data["edges"]
    assert len(nodes) >= 6
    assert len(edges) >= 5

    # Check node types
    node_types = {n["type"] for n in nodes}
    assert "tender" in node_types
    assert "company" in node_types
    assert "director" in node_types
    assert "address" in node_types

    # Check edge types
    edge_rel_types = {e.get("relationship_type") for e in edges}
    assert "PARTICIPATED_IN" in edge_rel_types or "HAS_DIRECTOR" in edge_rel_types

    # Check that provenance exists
    for n in nodes[:3]:
        assert "provenance" in n
        if n["provenance"]:
            assert "source_name" in n["provenance"]


def test_global_graph_filtering(client, auth_headers):
    # Filter only companies and directors
    res = client.get("/api/v1/network/graph?node_types=company&node_types=director", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    for n in data["nodes"]:
        assert n["type"] in {"company", "director"}

    # Filter by risk level
    res_risk = client.get("/api/v1/network/graph?risk_level=critical", headers=auth_headers)
    assert res_risk.status_code == 200
    data_risk = res_risk.json()
    for n in data_risk["nodes"]:
        assert n.get("risk") == "critical"


def test_entity_neighbors_traversal(client, auth_headers):
    # Depth 1 traversal on TND-8842
    res_d1 = client.get("/api/v1/network/entity/TND-8842/neighbors?depth=1", headers=auth_headers)
    assert res_d1.status_code == 200
    d1_nodes = res_d1.json()["nodes"]
    d1_ids = {n["id"] for n in d1_nodes}
    assert "TND-8842" in d1_ids

    # Depth 2 traversal should include 2-hop entities (e.g. directors or addresses)
    res_d2 = client.get("/api/v1/network/entity/TND-8842/neighbors?depth=2", headers=auth_headers)
    assert res_d2.status_code == 200
    d2_nodes = res_d2.json()["nodes"]
    assert len(d2_nodes) >= len(d1_nodes)

    # 404 on nonexistent entity
    res_404 = client.get("/api/v1/network/entity/NON_EXISTENT_ENTITY_XYZ/neighbors", headers=auth_headers)
    assert res_404.status_code == 404


def test_entity_search(client, auth_headers):
    # Search for Tender
    res = client.get("/api/v1/network/search?q=Highway", headers=auth_headers)
    assert res.status_code == 200
    results = res.json()
    assert len(results) >= 1
    assert any("TND-8842" in r["id"] or "Highway" in r["label"] for r in results)

    # Search for Director
    res_dir = client.get("/api/v1/network/search?q=Vance", headers=auth_headers)
    assert res_dir.status_code == 200
    dir_results = res_dir.json()
    assert len(dir_results) >= 1
    assert any("Arthur Vance" in r["label"] for r in dir_results)


def test_temporal_graph(client, auth_headers):
    res = client.get("/api/v1/network/temporal?start_year=2024&end_year=2026", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) >= 1


def test_graph_signals(client, auth_headers):
    res = client.get("/api/v1/network/signals", headers=auth_headers)
    assert res.status_code == 200
    signals = res.json()
    assert isinstance(signals, list)

    # In our benchmark demo dataset, Arthur Vance connects competing bidders
    sig_types = {s["signal_type"] for s in signals}
    assert "SHARED_DIRECTOR" in sig_types or "SHARED_REGISTERED_OFFICE" in sig_types

    # Ensure evidence details are present
    for s in signals:
        assert "evidence" in s
        assert "explanation" in s
        assert s["confidence"] > 0.0


def test_create_investigation_from_graph_node(client, auth_headers):
    payload = {
        "node_id": "TND-8842",
        "title": "Collusion Screening for Highway Project",
        "priority": "High",
        "notes": "Triggered by documented common directorship in ego-graph.",
    }
    res = client.post("/api/v1/network/investigations/create-from-node", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "case_ref" in data
    assert "CASE-2026" in data["case_ref"]
    assert data["priority"] == "High"
