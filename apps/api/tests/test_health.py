from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Verify that GET /api/health returns HTTP 200 and expected payload."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "CartelNet API"
    assert data["version"] == "1.0.0"


def test_api_v1_router_mounted():
    """Verify that /api/v1/ prefix routes are mounted and responsive."""
    response = client.get("/api/v1/tenders/")
    assert response.status_code == 200
    assert response.json()["module"] == "tenders"
