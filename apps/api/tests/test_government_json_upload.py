import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.government_uploads.models import (
    GovernmentDepartment,
    TenderParticipant,
    GovernmentUploadAudit,
)
from app.modules.tenders.models import Tender
from app.modules.companies.models import Company
from app.modules.bids.models import Bid
from app.core.security import create_access_token
from app.core.config import DEFAULT_ORG_ID


@pytest.fixture
def auth_headers():
    token = create_access_token(
        subject="gov-officer-test",
        organization_id=DEFAULT_ORG_ID,
        role="ADMIN",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def unauthorized_headers():
    token = create_access_token(
        subject="viewer-user",
        organization_id=DEFAULT_ORG_ID,
        role="VIEWER",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def valid_single_tender_payload():
    return {
        "department": {
            "name": "Public Works Department",
            "department_code": "PWD"
        },
        "tenders": [
            {
                "tender_id": "PWD-2026-1042",
                "title": "Highway Construction Project",
                "location": "Indore, Madhya Pradesh",
                "estimated_value": 85000000.0,
                "submission_deadline": "2026-09-30",
                "registered_companies": [
                    {
                        "company_id": "C001",
                        "company_name": "ABC Construction Pvt Ltd"
                    },
                    {
                        "company_id": "C002",
                        "company_name": "XYZ Infra Ltd"
                    }
                ],
                "bidders": [
                    {
                        "company_id": "C001",
                        "bid_amount": 84200000.0,
                        "bid_rank": 1,
                        "status": "qualified"
                    },
                    {
                        "company_id": "C002",
                        "bid_amount": 85100000.0,
                        "bid_rank": 2,
                        "status": "qualified"
                    }
                ]
            }
        ]
    }


def test_download_sample_template(client):
    response = client.get("/api/v1/government/uploads/sample-template/download")
    assert response.status_code == 200
    data = response.json()
    assert "department" in data
    assert "tenders" in data
    assert data["department"]["department_code"] == "PWD"


def test_reject_non_json_extension(client, auth_headers):
    # Reject CSV
    files = {"file": ("tenders.csv", b"tender_id,title\n1,Test", "text/csv")}
    res = client.post("/api/v1/government/uploads/validate", files=files, headers=auth_headers)
    assert res.status_code == 400
    assert "Only JSON files (.json) are permitted" in res.json()["detail"]

    # Reject XLSX
    files_xlsx = {"file": ("tenders.xlsx", b"dummy xlsx content", "application/vnd.ms-excel")}
    res_xlsx = client.post("/api/v1/government/uploads/validate", files=files_xlsx, headers=auth_headers)
    assert res_xlsx.status_code == 400


def test_validate_malformed_json(client, auth_headers):
    files = {"file": ("malformed.json", b"{broken json: true", "application/json")}
    res = client.post("/api/v1/government/uploads/validate", files=files, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert data["status"] == "INVALID"
    assert any("MALFORMED_JSON" in e["code"] for e in data["errors"])


def test_validate_missing_department_fields(client, auth_headers):
    payload = {
        "department": {"name": ""},  # Missing department_code and empty name
        "tenders": [
            {
                "tender_id": "T1",
                "title": "Title 1",
                "registered_companies": [{"company_id": "C1", "company_name": "Name 1"}],
                "bidders": [{"company_id": "C1", "bid_amount": 1000.0, "status": "qualified"}]
            }
        ]
    }
    raw = json.dumps(payload).encode("utf-8")
    files = {"file": ("test.json", raw, "application/json")}
    res = client.post("/api/v1/government/uploads/validate", files=files, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert data["status"] == "INVALID"
    paths = [e["path"] for e in data["errors"]]
    assert any("department" in p for p in paths)


def test_validate_negative_bid_amount(client, auth_headers, valid_single_tender_payload):
    valid_single_tender_payload["tenders"][0]["bidders"][0]["bid_amount"] = -500.0
    raw = json.dumps(valid_single_tender_payload).encode("utf-8")
    files = {"file": ("test.json", raw, "application/json")}
    res = client.post("/api/v1/government/uploads/validate", files=files, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert any("bid_amount" in e["path"] for e in data["errors"])


def test_validate_unregistered_bidder_rejection(client, auth_headers, valid_single_tender_payload):
    # Bidder company_id C999 is NOT in registered_companies
    valid_single_tender_payload["tenders"][0]["bidders"][0]["company_id"] = "C999"
    raw = json.dumps(valid_single_tender_payload).encode("utf-8")
    files = {"file": ("test.json", raw, "application/json")}
    res = client.post("/api/v1/government/uploads/validate", files=files, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert any(e["code"] == "UNREGISTERED_BIDDER" for e in data["errors"])


def test_validate_clean_json_does_not_mutate_db(client, db, auth_headers, valid_single_tender_payload):
    raw = json.dumps(valid_single_tender_payload).encode("utf-8")
    files = {"file": ("clean.json", raw, "application/json")}
    res = client.post("/api/v1/government/uploads/validate", files=files, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "VALID"
    assert data["summary"]["tenders"] == 1
    assert data["summary"]["companies"] == 2
    assert data["summary"]["bidders"] == 2

    # Verify dry-run did NOT create Tender or Bid records in DB
    tender_in_db = db.query(Tender).filter(Tender.tender_ref == "PWD-2026-1042").first()
    assert tender_in_db is None

    # Verify audit record WAS created
    audit = db.query(GovernmentUploadAudit).filter(GovernmentUploadAudit.id == data["upload_id"]).first()
    assert audit is not None
    assert audit.status == "VALID"


def test_atomic_import_success(client, db, auth_headers, valid_single_tender_payload):
    raw = json.dumps(valid_single_tender_payload).encode("utf-8")
    files = {"file": ("import.json", raw, "application/json")}
    res = client.post("/api/v1/government/uploads/import", files=files, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "IMPORTED"
    assert data["summary"]["tenders"] == 1
    assert data["summary"]["companies"] == 2
    assert data["summary"]["participants"] == 2
    assert data["summary"]["bids"] == 2

    # Verify Department created
    dept = db.query(GovernmentDepartment).filter(GovernmentDepartment.department_code == "PWD").first()
    assert dept is not None
    assert dept.name == "Public Works Department"

    # Verify Tender created with provenance
    tender = db.query(Tender).filter(Tender.tender_ref == "PWD-2026-1042").first()
    assert tender is not None
    assert tender.estimated_value == 85000000.0
    assert tender.department_id == dept.id
    assert tender.source_upload_id == data["upload_id"]

    # Verify Companies created with provenance
    c1 = db.query(Company).filter(Company.source_company_id == "C001").first()
    c2 = db.query(Company).filter(Company.source_company_id == "C002").first()
    assert c1 is not None and c2 is not None
    assert c1.legal_name == "ABC Construction Pvt Ltd"
    assert c1.source_upload_id == data["upload_id"]

    # Verify Bids created
    bids = db.query(Bid).filter(Bid.tender_id == tender.id).all()
    assert len(bids) == 2
    assert any(b.amount == 84200000.0 and b.bid_rank == 1 for b in bids)


def test_canonical_company_deduplication(client, db, auth_headers):
    # Upload first batch with C001
    batch_1 = {
        "department": {"name": "Roads Dept", "department_code": "RD"},
        "tenders": [
            {
                "tender_id": "RD-001",
                "title": "Road Repair A",
                "estimated_value": 100000.0,
                "registered_companies": [{"company_id": "C001", "company_name": "ABC Construction Pvt Ltd"}],
                "bidders": [{"company_id": "C001", "bid_amount": 95000.0, "status": "qualified"}]
            }
        ]
    }
    client.post("/api/v1/government/uploads/import", files={"file": ("b1.json", json.dumps(batch_1).encode(), "application/json")}, headers=auth_headers)

    initial_c1 = db.query(Company).filter(Company.source_company_id == "C001").first()
    assert initial_c1 is not None
    initial_id = initial_c1.id

    # Upload second batch with SAME company C001 in a different tender
    batch_2 = {
        "department": {"name": "Roads Dept", "department_code": "RD"},
        "tenders": [
            {
                "tender_id": "RD-002",
                "title": "Road Repair B",
                "estimated_value": 200000.0,
                "registered_companies": [{"company_id": "C001", "company_name": "ABC Construction Pvt Ltd"}],
                "bidders": [{"company_id": "C001", "bid_amount": 190000.0, "status": "qualified"}]
            }
        ]
    }
    res2 = client.post("/api/v1/government/uploads/import", files={"file": ("b2.json", json.dumps(batch_2).encode(), "application/json")}, headers=auth_headers)
    assert res2.status_code == 200
    assert res2.json()["summary"]["companies"] == 0  # 0 new companies created, reused existing!

    all_c1 = db.query(Company).filter(Company.source_company_id == "C001").all()
    assert len(all_c1) == 1
    assert all_c1[0].id == initial_id


def test_upload_history_and_detail(client, auth_headers, valid_single_tender_payload):
    # Upload one valid payload first so audit history is populated
    raw = json.dumps(valid_single_tender_payload).encode("utf-8")
    client.post("/api/v1/government/uploads/validate", files={"file": ("history_sample.json", raw, "application/json")}, headers=auth_headers)

    # Fetch history list
    res = client.get("/api/v1/government/uploads", headers=auth_headers)
    assert res.status_code == 200
    history = res.json()
    assert isinstance(history, list)
    assert len(history) > 0

    first_id = history[0]["upload_id"]
    res_det = client.get(f"/api/v1/government/uploads/{first_id}", headers=auth_headers)
    assert res_det.status_code == 200
    detail = res_det.json()
    assert detail["upload_id"] == first_id
    assert "status" in detail


def test_rbac_security_unauthorized_role(client, unauthorized_headers, valid_single_tender_payload):
    # Viewer role should be rejected with 403 Forbidden
    raw = json.dumps(valid_single_tender_payload).encode("utf-8")
    files = {"file": ("test.json", raw, "application/json")}
    res = client.post("/api/v1/government/uploads/validate", files=files, headers=unauthorized_headers)
    assert res.status_code == 403
    assert "Government or Administrator privileges required" in res.json()["detail"]
