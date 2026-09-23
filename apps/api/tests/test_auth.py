import pytest


def test_auth_registration_and_login(client):
    # 1. Register a new user and organization
    reg_payload = {
        "email": "auditor.smith@integrity.gov",
        "password": "SecurePassword123!",
        "full_name": "Auditor Smith",
        "organization_name": "State Audit Bureau",
        "organization_type": "GOVERNMENT_AUTHORITY",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == "auditor.smith@integrity.gov"
    assert reg_data["organization"]["name"] == "State Audit Bureau"
    assert reg_data["organization"]["role"] == "ADMIN"

    # Duplicate registration should fail
    dup_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 400

    # 2. Login
    login_payload = {
        "email": "auditor.smith@integrity.gov",
        "password": "SecurePassword123!",
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token

    # 3. Invalid login
    bad_login = client.post("/api/v1/auth/login", json={
        "email": "auditor.smith@integrity.gov",
        "password": "WrongPassword",
    })
    assert bad_login.status_code == 401

    # 4. Get Current User (/me)
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["user"]["email"] == "auditor.smith@integrity.gov"
    assert len(me_data["organizations"]) >= 1


def test_demo_login(client):
    res = client.post("/api/v1/auth/demo-login?role=INVESTIGATOR")
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "demo" in data["user"]["email"]
    assert data["organization"]["role"] == "INVESTIGATOR"
