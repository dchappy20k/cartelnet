import io
from app.modules.ingestion.normalization import (
    normalize_company_name,
    normalize_director_name,
    normalize_address,
    parse_amount,
)


def test_company_normalization():
    assert normalize_company_name("Meridian Civil Works Ltd.") == "meridian civil works"
    assert normalize_company_name("Apex Infrastructure Group LLC") == "apex infrastructure"
    assert normalize_company_name("Clearwater Utilities Private Limited") == "clearwater utilities"
    assert normalize_company_name("  PureFlow   Engineering Corp.  ") == "pureflow engineering"


def test_director_normalization():
    assert normalize_director_name("Dr. Arthur Vance") == "arthur vance"
    assert normalize_director_name("Mr. Brian Chen") == "brian chen"
    assert normalize_director_name("  Elena Rostova  ") == "elena rostova"


def test_address_normalization():
    addr1, hash1 = normalize_address("44 Kingsway, Harbor District, Street")
    addr2, hash2 = normalize_address("44 kingsway harbor district st")
    assert addr1 == "44 kingsway harbor district st"
    assert hash1 == hash2


def test_amount_parsing():
    assert parse_amount("$48.2M") == 48_200_000.0
    assert parse_amount("22,750,000") == 22_750_000.0
    assert parse_amount("500K") == 500_000.0
    assert parse_amount(15400000) == 15_400_000.0


def test_csv_upload_and_validation(client):
    csv_data = """tender_ref,tender_title,authority_name,estimated_value,category,company_name,bid_amount,bid_status
TND-TEST-1,Test Highway,Road Agency,1000000,Infrastructure,Company Alpha Ltd.,950000,Awarded
TND-TEST-1,Test Highway,Road Agency,1000000,Infrastructure,Company Beta Inc.,970000,Runner-up
"""
    files = {"file": ("test_tenders.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    response = client.post("/api/v1/ingestion/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["total_rows"] == 2
    assert data["valid_rows"] == 2
    assert data["error_rows"] == 0
    assert data["is_valid"] is True


def test_demo_seed_endpoint(client):
    response = client.post("/api/v1/ingestion/demo-seed")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["tenders_count"] >= 5
    assert data["bids_count"] >= 15
    assert data["companies_count"] >= 5
