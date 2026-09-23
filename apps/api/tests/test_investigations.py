import pytest


def test_investigation_lifecycle(client):
    # 1. Seed demo dataset first
    seed_res = client.post("/api/v1/ingestion/demo-seed")
    assert seed_res.status_code == 200

    # 2. Screen TND-8842 to generate risk signals
    screen_res = client.post("/api/v1/risk/tenders/TND-8842/screen")
    assert screen_res.status_code == 200

    # 3. Create investigation case linked to TND-8842
    create_payload = {
        "title": "Collusion review: Highway Resurfacing Programme",
        "tender_id": "TND-8842",
        "priority": "Critical",
        "investigator": "Marcus Vance",
        "initial_note": "Initiating investigation due to tight CV spread and shared directorship.",
    }
    create_res = client.post("/api/v1/investigations/", json=create_payload)
    assert create_res.status_code == 201
    case = create_res.json()

    assert case["case_ref"].startswith("CASE-2026-")
    assert case["title"] == create_payload["title"]
    assert case["priority"] == "Critical"
    assert case["status"] == "Open"
    assert case["investigator"] == "Marcus Vance"
    assert case["entities_count"] == 3
    assert case["signals_count"] >= 2
    assert len(case["notes"]) == 1
    assert "Initiating investigation" in case["notes"][0]["content"]

    case_ref = case["case_ref"]

    # 4. List investigations
    list_res = client.get("/api/v1/investigations/")
    assert list_res.status_code == 200
    cases_list = list_res.json()
    assert any(c["case_ref"] == case_ref for c in cases_list)

    # 5. Fetch 360-degree case details
    detail_res = client.get(f"/api/v1/investigations/{case_ref}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["case_ref"] == case_ref
    assert detail["tender_ref"] == "TND-8842"
    assert len(detail["bidders"]) == 3
    assert len(detail["signals"]) >= 2
    # Ensure evidence is attached
    assert any(len(s.get("evidence", [])) > 0 for s in detail["signals"])

    # 6. Add investigator note
    note_payload = {
        "author_name": "Marcus Vance",
        "content": "Requested corporate registration certificates from Trade Registry.",
    }
    note_res = client.post(f"/api/v1/investigations/{case_ref}/notes", json=note_payload)
    assert note_res.status_code == 201
    note = note_res.json()
    assert note["author_name"] == "Marcus Vance"
    assert "Trade Registry" in note["content"]

    # 7. Update status to Escalated
    update_payload = {
        "status": "Escalated",
        "note": "Recommending formal antitrust inquiry to Competition Commission.",
    }
    update_res = client.patch(f"/api/v1/investigations/{case_ref}", json=update_payload)
    assert update_res.status_code == 200
    updated_case = update_res.json()
    assert updated_case["status"] == "Escalated"
    # Should have audit notes logged
    assert len(updated_case["notes"]) >= 3


def test_investigation_not_found(client):
    client.post("/api/v1/ingestion/demo-seed")
    res = client.get("/api/v1/investigations/NONEXISTENT-CASE")
    assert res.status_code == 404
