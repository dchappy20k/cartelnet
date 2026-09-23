import pytest


def test_tenders_endpoints(client):
    # Seed demo data
    client.post("/api/v1/ingestion/demo-seed")

    # List tenders
    res = client.get("/api/v1/tenders/")
    assert res.status_code == 200
    tenders = res.json()
    assert len(tenders) >= 4
    refs = [t["tender_ref"] for t in tenders]
    assert "TND-8842" in refs
    assert "TND-8755" in refs

    # Search tenders
    search_res = client.get("/api/v1/tenders/?search=Highway")
    assert search_res.status_code == 200
    search_tenders = search_res.json()
    assert len(search_tenders) >= 1
    assert any("Highway" in t["title"] for t in search_tenders)

    # Tender 360
    t360_res = client.get("/api/v1/tenders/TND-8842")
    assert t360_res.status_code == 200
    t360 = t360_res.json()

    assert t360["tender"]["tender_ref"] == "TND-8842"
    assert len(t360["bids"]) == 3
    assert t360["metrics"]["cv_pct"] <= 1.5  # Price clustering test case
    assert t360["metrics"]["spread_pct"] <= 3.0

    # 404 for nonexistent tender
    bad_res = client.get("/api/v1/tenders/NONEXISTENT-TENDER")
    assert bad_res.status_code == 404
