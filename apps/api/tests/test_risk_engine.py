from app.modules.risk.detectors.price_clustering import PriceClusteringDetector
from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.modules.companies.models import Company


def test_price_clustering_unit(db):
    detector = PriceClusteringDetector()
    tender = Tender(id="t1", organization_id="org1", tender_ref="TND-1", title="Test", authority="Gov")
    c1 = Company(id="c1", organization_id="org1", legal_name="Alpha", normalized_name="alpha")
    c2 = Company(id="c2", organization_id="org1", legal_name="Beta", normalized_name="beta")
    c3 = Company(id="c3", organization_id="org1", legal_name="Gamma", normalized_name="gamma")

    # Tight clustering: $46.2M, $46.9M, $47.4M
    tight_bids = [
        Bid(id="b1", tender_id="t1", company_id="c1", amount=46200000, company=c1),
        Bid(id="b2", tender_id="t1", company_id="c2", amount=46900000, company=c2),
        Bid(id="b3", tender_id="t1", company_id="c3", amount=47400000, company=c3),
    ]

    signals = detector.analyze(tender=tender, bids=tight_bids, db=db, organization_id="org1")
    assert len(signals) == 1
    assert signals[0].detector_code == "PRICE_CLUSTERING"
    assert signals[0].severity in ("high", "critical")
    assert "narrow price variance" in signals[0].description

    # Competitive spread: $10M, $15M, $22M
    wide_bids = [
        Bid(id="b4", tender_id="t1", company_id="c1", amount=10000000, company=c1),
        Bid(id="b5", tender_id="t1", company_id="c2", amount=15000000, company=c2),
        Bid(id="b6", tender_id="t1", company_id="c3", amount=22000000, company=c3),
    ]
    signals_wide = detector.analyze(tender=tender, bids=wide_bids, db=db, organization_id="org1")
    assert len(signals_wide) == 0


def test_get_risk_rules(client):
    response = client.get("/api/v1/risk/rules")
    assert response.status_code == 200
    rules = response.json()
    assert len(rules) == 5
    codes = [r["code"] for r in rules]
    assert "PRICE_CLUSTERING" in codes
    assert "SHARED_DIRECTORS" in codes
    assert "SHARED_ADDRESS" in codes
    assert "REPEATED_PARTICIPATION" in codes
    assert "HISTORICAL_ROTATION" in codes


def test_benchmark_screening_end_to_end(client):
    # 1. Seed benchmark dataset
    seed_res = client.post("/api/v1/ingestion/demo-seed")
    assert seed_res.status_code == 200

    # 2. Screen TND-8842 (Suspicious: clustering + shared director + shared address)
    screen_res = client.post("/api/v1/risk/tenders/TND-8842/screen")
    assert screen_res.status_code == 200
    tnd_8842 = screen_res.json()
    assert tnd_8842["tender_ref"] == "TND-8842"
    assert tnd_8842["risk_level"] in ("high", "critical")
    assert tnd_8842["risk_score"] >= 70
    assert tnd_8842["signals_count"] >= 3

    detected_codes = [s["detector_code"] for s in tnd_8842["signals"]]
    assert "PRICE_CLUSTERING" in detected_codes
    assert "SHARED_DIRECTORS" in detected_codes
    assert "SHARED_ADDRESS" in detected_codes

    # Verify evidence items exist
    dir_signal = next(s for s in tnd_8842["signals"] if s["detector_code"] == "SHARED_DIRECTORS")
    assert len(dir_signal["evidence_items"]) > 0
    assert dir_signal["evidence_items"][0]["data_payload"]["director_name"] == "Arthur Vance"

    # 3. Screen TND-8790 (Hospital IT Modernisation - Clean control)
    clean_res = client.post("/api/v1/risk/tenders/TND-8790/screen")
    assert clean_res.status_code == 200
    tnd_clean = clean_res.json()
    assert tnd_clean["risk_score"] == 0
    assert tnd_clean["risk_level"] == "low"
    assert tnd_clean["signals_count"] == 0

    # 4. Stream signals
    stream_res = client.get("/api/v1/risk/signals")
    assert stream_res.status_code == 200
    signals = stream_res.json()
    assert len(signals) >= 3
