import pytest


def test_complete_golden_flow(client):
    """
    Validates the end-to-end CartelNet Golden Flow:
    1. Authenticate with Demo Login
    2. Seed realistic benchmark procurement dataset
    3. Run on-demand screening across all tenders
    4. Inspect Tender 360 for high-risk tender TND-8842 (CV <= 1.5%, shared director, shared address)
    5. Explore relationship ego-subgraph
    6. Open formal investigation case
    7. Log timestamped investigator note
    8. Export institutional audit report with legal safety disclaimers
    """
    # Step 1: Login
    login_res = client.post("/api/v1/auth/demo-login?role=INVESTIGATOR")
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: Ingest benchmark demo dataset
    seed_res = client.post("/api/v1/ingestion/demo-seed", headers=headers)
    assert seed_res.status_code == 200
    assert seed_res.json()["tenders_count"] >= 4

    # Step 3: Screen all tenders
    screen_res = client.post("/api/v1/risk/screen-all", headers=headers)
    assert screen_res.status_code == 200
    screened_tenders = screen_res.json()
    assert len(screened_tenders) >= 4

    tnd_8842_screen = next(t for t in screened_tenders if t["tender_ref"] == "TND-8842")
    assert tnd_8842_screen["risk_score"] >= 70
    assert tnd_8842_screen["risk_level"] in ("high", "critical")

    # Step 4: Open Tender 360
    t360_res = client.get("/api/v1/tenders/TND-8842", headers=headers)
    assert t360_res.status_code == 200
    t360 = t360_res.json()
    assert len(t360["bids"]) == 3
    assert len(t360["signals"]) >= 3
    # Check that evidence payloads are bound to signals
    for s in t360["signals"]:
        assert len(s["evidence"]) > 0

    # Step 5: Explore relationship ego-graph
    graph_res = client.get("/api/v1/network/tenders/TND-8842/graph", headers=headers)
    assert graph_res.status_code == 200
    graph = graph_res.json()
    assert len(graph["nodes"]) >= 6
    assert any(n["type"] == "director" and "Vance" in n["label"] for n in graph["nodes"])
    assert any(n["type"] == "address" and "Kingsway" in n["label"] for n in graph["nodes"])

    # Step 6: Open formal investigation case
    case_payload = {
        "title": "Anti-collusion inquiry into Highway Resurfacing Programme",
        "tender_id": "TND-8842",
        "priority": "Critical",
        "investigator": "Lead Investigator",
        "initial_note": "Initiating priority investigation following automated screening (Score: 85, Critical).",
    }
    case_res = client.post("/api/v1/investigations/", json=case_payload, headers=headers)
    assert case_res.status_code == 201
    case = case_res.json()
    case_ref = case["case_ref"]
    assert case_ref.startswith("CASE-2026-")

    # Step 7: Log timestamped investigator note
    note_payload = {
        "author_name": "Lead Investigator",
        "content": "Requested corporate registration records from Companies House regarding Arthur Vance directorships.",
    }
    note_res = client.post(f"/api/v1/investigations/{case_ref}/notes", json=note_payload, headers=headers)
    assert note_res.status_code == 201
    assert "Arthur Vance" in note_res.json()["content"]

    # Step 8: Export institutional audit report
    report_req = {
        "report_type": "TENDER_RISK_AUDIT",
        "target_id": "TND-8842",
        "format": "HTML",
        "include_evidence_payloads": True,
        "auditor_name": "Lead Integrity Officer",
    }
    report_res = client.post("/api/v1/reports/generate", json=report_req, headers=headers)
    assert report_res.status_code == 200
    report = report_res.json()
    assert report["report_type"] == "TENDER_RISK_AUDIT"
    assert "LEGAL & REGULATORY NOTICE" in report["rendered_content"]
    assert "CartelNet Procurement Intelligence" in report["rendered_content"]
