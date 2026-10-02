"""Backend tests for contact + guestbook features via public URL."""
import os
import uuid
import pytest
import httpx

BASE = os.environ.get("TEST_API_URL")
if not BASE:
    pytest.fail("TEST_API_URL debe configurarse explícitamente para ejecutar pruebas de integración.")
BASE = BASE.rstrip("/")


def require_admin_credentials():
    email = os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("ADMIN_PASSWORD")
    if not email or not password:
        pytest.fail("ADMIN_EMAIL y ADMIN_PASSWORD deben configurarse para ejecutar las pruebas de comportamiento.")
    return {"email": email, "password": password}


@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BASE, timeout=30) as c:
        yield c


# ---------- Guestbook ----------
def test_guestbook_list_shape(client):
    r = client.get("/api/guestbook", params={"page": 1, "size": 10})
    assert r.status_code == 200
    body = r.json()
    assert set(["total", "page", "size", "items"]).issubset(body.keys())
    assert body["page"] == 1 and body["size"] == 10
    for it in body["items"]:
        assert "email" not in it and "_id" not in it
        assert "id" in it and "nombre" in it and "mensaje" in it and "created_at" in it


def test_guestbook_create_then_list_newest_first(client):
    name = f"TEST_{uuid.uuid4().hex[:6]}"
    r = client.post("/api/guestbook", json={
        "nombre": name, "lugar": "Toledo", "uco": "BRI X",
        "mensaje": "Mensaje de prueba de testing agent.", "email": "test@example.com"
    })
    if r.status_code == 429:
        pytest.skip("rate limited (expected)")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["nombre"] == name
    assert "email" not in body and "_id" not in body
    assert "id" in body and "created_at" in body

    lst = client.get("/api/guestbook", params={"page": 1, "size": 5}).json()
    assert lst["items"][0]["id"] == body["id"], "newest first ordering broken"
    # clean up so test signatures never pollute the real guestbook
    admin = require_admin_credentials()
    tok = client.post("/api/auth/login", json=admin).json()["access_token"]
    assert client.delete(f"/api/admin/guestbook/{body['id']}", headers={"Authorization": f"Bearer {tok}"}).status_code == 200


def test_guestbook_validation_short_fields(client):
    r = client.post("/api/guestbook", json={"nombre": "A", "mensaje": "corto"})
    assert r.status_code == 422
    r = client.post("/api/guestbook", json={"nombre": "Valid Name", "mensaje": "abcd"})  # <5
    assert r.status_code == 422


def test_guestbook_honeypot_400(client):
    r = client.post("/api/guestbook", json={
        "nombre": "Bot Name", "mensaje": "Spam largo mensaje",
        "website": "http://spam.example.com",
    })
    assert r.status_code == 400


# ---------- Contact ----------
def test_contact_validation_invalid_tema(client):
    r = client.post("/api/contact", json={"tema": "NotValid", "asunto": "Asunto", "nota": "Nota válida"})
    assert r.status_code == 422


def test_contact_validation_short_asunto(client):
    r = client.post("/api/contact", json={"tema": "Otros", "asunto": "x", "nota": "válida"})
    assert r.status_code == 422


def test_contact_honeypot_silent_ok(client):
    r = client.post("/api/contact", json={
        "tema": "Otros", "asunto": "Honeypot", "nota": "Spam spam",
        "website": "http://spam.example.com",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok" and "id" not in body


# NOTE: We do NOT test a real successful contact submission from pytest,
# to avoid spamming the owner inbox. The frontend playwright test will
# perform exactly ONE real submission as required.
