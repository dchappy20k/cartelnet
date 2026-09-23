import pytest


def test_network_endpoints_after_seed(client):
    # 1. Seed demo dataset first
    seed_res = client.post("/api/v1/ingestion/demo-seed")
    assert seed_res.status_code == 200

    # 2. Test global graph endpoint
    graph_res = client.get("/api/v1/network/graph")
    assert graph_res.status_code == 200
    graph_data = graph_res.json()

    assert "nodes" in graph_data
    assert "edges" in graph_data
    assert "summary" in graph_data

    nodes = graph_data["nodes"]
    edges = graph_data["edges"]
    summary = graph_data["summary"]

    assert len(nodes) > 10
    assert len(edges) > 10
    assert summary["total_nodes"] == len(nodes)
    assert summary["total_edges"] == len(edges)

    # Check node types
    node_types = {n["type"] for n in nodes}
    assert "tender" in node_types
    assert "company" in node_types
    assert "director" in node_types
    assert "address" in node_types

    # Check coordinates are scaled within standard SVG viewport
    for n in nodes:
        assert 50.0 <= n["x"] <= 750.0
        assert 50.0 <= n["y"] <= 460.0

    # Check edge aliases ("from", "to", "label")
    for e in edges:
        assert "from" in e
        assert "to" in e


def test_tender_subgraph_tnd_8842(client):
    # Seed dataset
    client.post("/api/v1/ingestion/demo-seed")

    # Fetch subgraph for TND-8842
    subgraph_res = client.get("/api/v1/network/tenders/TND-8842/graph")
    assert subgraph_res.status_code == 200
    data = subgraph_res.json()

    nodes = data["nodes"]
    edges = data["edges"]

    # Central tender node
    tender_nodes = [n for n in nodes if n["type"] == "tender" and n["id"] == "TND-8842"]
    assert len(tender_nodes) == 1
    t_node = tender_nodes[0]
    # Pinned center
    assert t_node["x"] == 400.0
    assert t_node["y"] == 250.0

    # Must contain the 3 bidders for TND-8842 (Apex, Meridian, Northgate)
    company_labels = [n["label"] for n in nodes if n["type"] == "company"]
    assert any("Apex" in name for name in company_labels)
    assert any("Meridian" in name for name in company_labels)
    assert any("Northgate" in name for name in company_labels)

    # Must contain the shared director Arthur Vance
    director_labels = [n["label"] for n in nodes if n["type"] == "director"]
    assert any("Vance" in name for name in director_labels)


def test_tender_subgraph_not_found(client):
    client.post("/api/v1/ingestion/demo-seed")
    res = client.get("/api/v1/network/tenders/NONEXISTENT-9999/graph")
    assert res.status_code == 404


def test_cluster_discovery(client):
    client.post("/api/v1/ingestion/demo-seed")

    clusters_res = client.get("/api/v1/network/clusters")
    assert clusters_res.status_code == 200
    cluster_data = clusters_res.json()

    assert cluster_data["total_clusters"] >= 2
    cluster_types = [c["cluster_type"] for c in cluster_data["clusters"]]
    assert "SHARED_DIRECTORS" in cluster_types
    assert "SHARED_ADDRESS" in cluster_types

    # Find the shared director cluster
    dir_clusters = [c for c in cluster_data["clusters"] if c["cluster_type"] == "SHARED_DIRECTORS"]
    assert len(dir_clusters) >= 1
    assert len(dir_clusters[0]["companies"]) >= 2
    assert "TND-8842" in dir_clusters[0]["tenders_involved"]


def test_company_dossier(client):
    client.post("/api/v1/ingestion/demo-seed")

    # Find a company ID from the global graph
    graph_res = client.get("/api/v1/network/graph")
    nodes = graph_res.json()["nodes"]
    company_node = next(n for n in nodes if n["type"] == "company" and "Apex" in n["label"])
    company_id = company_node["id"]

    dossier_res = client.get(f"/api/v1/network/companies/{company_id}/dossier")
    assert dossier_res.status_code == 200
    dossier = dossier_res.json()

    assert dossier["id"] == company_id
    assert "Apex" in dossier["legal_name"]
    assert dossier["total_bids"] >= 1
    assert len(dossier["directors"]) >= 1
    assert any("Vance" in d["full_name"] for d in dossier["directors"])
    assert len(dossier["co_bidders"]) >= 1


def test_company_dossier_not_found(client):
    client.post("/api/v1/ingestion/demo-seed")
    res = client.get("/api/v1/network/companies/non-existent-comp-id/dossier")
    assert res.status_code == 404
