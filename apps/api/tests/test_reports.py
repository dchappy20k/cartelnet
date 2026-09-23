import pytest


def test_report_templates(client):
    res = client.get("/api/v1/reports/templates")
    assert res.status_code == 200
    templates = res.json()
    assert len(templates) >= 2
    codes = [t["code"] for t in templates]
    assert "TENDER_RISK_AUDIT" in codes
    assert "INVESTIGATION_CASE_DOSSIER" in codes


def test_tender_risk_report_generation(client):
    # Seed & Screen
    client.post("/api/v1/ingestion/demo-seed")
    client.post("/api/v1/risk/tenders/TND-8842/screen")

    # Generate HTML report
    req_html = {
        "report_type": "TENDER_RISK_AUDIT",
        "target_id": "TND-8842",
        "format": "HTML",
        "include_evidence_payloads": True,
        "auditor_name": "Chief Auditor",
    }
    res_html = client.post("/api/v1/reports/generate", json=req_html)
    assert res_html.status_code == 200
    report = res_html.json()

    assert report["report_type"] == "TENDER_RISK_AUDIT"
    assert report["target_id"] == "TND-8842"
    assert report["risk_score"] is not None
    assert report["risk_level"] is not None
    assert len(report["entities_involved"]) == 3
    assert len(report["evidence_log"]) >= 2
    assert "rendered_content" in report
    assert "<!DOCTYPE html>" in report["rendered_content"]
    assert "CartelNet Procurement Intelligence" in report["rendered_content"]
    assert "LEGAL & REGULATORY NOTICE" in report["rendered_content"]

    # Generate Markdown report
    req_md = {
        "report_type": "TENDER_RISK_AUDIT",
        "target_id": "TND-8842",
        "format": "MARKDOWN",
    }
    res_md = client.post("/api/v1/reports/generate", json=req_md)
    assert res_md.status_code == 200
    report_md = res_md.json()
    assert report_md["format"] == "MARKDOWN"
    assert "# CartelNet Procurement Risk Audit" in report_md["rendered_content"]


def test_investigation_case_report_generation(client):
    client.post("/api/v1/ingestion/demo-seed")

    # Create case
    case_res = client.post("/api/v1/investigations/", json={
        "title": "Water Treatment Review",
        "tender_id": "TND-8817",
        "priority": "Medium",
        "investigator": "Elena Ward",
        "initial_note": "Case opened for compliance audit.",
    })
    case = case_res.json()
    case_ref = case["case_ref"]

    # Generate case report
    req = {
        "report_type": "INVESTIGATION_CASE_DOSSIER",
        "target_id": case_ref,
        "format": "HTML",
    }
    res = client.post("/api/v1/reports/generate", json=req)
    assert res.status_code == 200
    report = res.json()

    assert report["report_type"] == "INVESTIGATION_CASE_DOSSIER"
    assert report["target_id"] == case_ref
    assert "Case opened for compliance audit" in report["rendered_content"]


def test_report_target_not_found(client):
    client.post("/api/v1/ingestion/demo-seed")
    req = {
        "report_type": "TENDER_RISK_AUDIT",
        "target_id": "NONEXISTENT_TENDER_REF",
    }
    res = client.post("/api/v1/reports/generate", json=req)
    assert res.status_code == 404
