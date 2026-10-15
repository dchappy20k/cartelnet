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


def test_publish_and_manage_tender_lifecycle(client):
    """Verifies publishing a tender, managing status, adding bidders, and fetching live project status."""
    # 1. Publish tender with bidders
    publish_payload = {
        "tender_ref": "TDR-2026-METRO-TEST",
        "title": "Metropolitan Expressway Smart Lighting & Power Grid",
        "department_name": "Ministry of Urban Infrastructure",
        "department_code": "MUI-METRO",
        "estimated_value": 5000000.0,
        "status": "Live",
        "progress_stage": "Live & Accepting Bids",
        "bidders": [
            {
                "company_name": "Metro Grid Solutions Ltd",
                "bid_amount": 4920000.0,
                "bid_status": "Submitted",
                "registered_address": "404 Industrial Sector, North District",
                "directors": ["Elena Rostova"],
            },
            {
                "company_name": "Volt Power Systems",
                "bid_amount": 4960000.0,
                "bid_status": "Submitted",
                "registered_address": "502 Commercial Park",
                "directors": ["David Vance"],
            },
        ],
    }

    pub_res = client.post("/api/v1/tenders/publish", json=publish_payload)
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["tender"]["tender_ref"] == "TDR-2026-METRO-TEST"
    assert pub_data["tender"]["bidders_count"] == 2
    assert len(pub_data["bids"]) == 2

    # 2. Get Government Project Status
    status_res = client.get("/api/v1/tenders/TDR-2026-METRO-TEST/project-status")
    assert status_res.status_code == 200
    p_status = status_res.json()
    assert p_status["is_live"] is True
    assert p_status["progress_stage"] == "Live & Accepting Bids"
    assert p_status["progress_pct"] == 40
    assert len(p_status["bidders"]) == 2
    assert p_status["bidding_summary"]["min_bid"] == 4920000.0
    assert p_status["bidding_summary"]["max_bid"] == 4960000.0

    # 3. Add a 3rd bidder to the live tender
    add_bidder_payload = {
        "company_name": "Apex Engineering Corp",
        "bid_amount": 4940000.0,
        "bid_status": "Under Review",
        "registered_address": "404 Industrial Sector, North District",
        "directors": ["Elena Rostova"],  # Shared director & address for collusion trigger
    }
    bidder_res = client.post("/api/v1/tenders/TDR-2026-METRO-TEST/bidders", json=add_bidder_payload)
    assert bidder_res.status_code == 200
    bidder_data = bidder_res.json()
    assert bidder_data["tender"]["bidders_count"] == 3

    # 4. Manage status and progress stage
    manage_payload = {
        "status": "Under Review",
        "progress_stage": "Technical Evaluation",
        "run_risk_screening": True,
    }
    manage_res = client.patch("/api/v1/tenders/TDR-2026-METRO-TEST/manage", json=manage_payload)
    assert manage_res.status_code == 200
    manage_data = manage_res.json()
    assert manage_data["tender"]["status"] == "Under Review"

    # Verify updated project status reflects changes
    updated_status = client.get("/api/v1/tenders/TDR-2026-METRO-TEST/project-status").json()
    assert updated_status["status"] == "Under Review"
    assert updated_status["progress_stage"] == "Bid Evaluation & Compliance Check"
    assert updated_status["progress_pct"] == 75
    assert len(updated_status["bidders"]) == 3

