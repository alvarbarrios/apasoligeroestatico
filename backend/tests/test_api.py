"""Regression tests for contact + guestbook API. Run: cd /app/backend && pytest tests -q"""
import os
import uuid
import pytest
import httpx

BASE = os.environ.get("TEST_API_URL", "http://localhost:8001").rstrip("/")


def require_admin_credentials():
    email = os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("ADMIN_PASSWORD")
    if not email or not password:
        pytest.fail("ADMIN_EMAIL y ADMIN_PASSWORD deben configurarse para ejecutar las pruebas de autenticación.")
    return {"email": email, "password": password}


ADMIN = require_admin_credentials()


@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BASE, timeout=30) as c:
        yield c


def test_guestbook_create_and_list(client):
    name = f"Test {uuid.uuid4().hex[:6]}"
    r = client.post("/api/guestbook", json={"nombre": name, "lugar": "Madrid", "mensaje": "Mensaje de prueba válido."})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["nombre"] == name and "email" not in body and "_id" not in body
    lst = client.get("/api/guestbook", params={"page": 1, "size": 5}).json()
    assert lst["total"] >= 1 and any(i["id"] == body["id"] for i in lst["items"])
    tok = client.post("/api/auth/login", json=ADMIN).json()["access_token"]
    assert client.delete(f"/api/admin/guestbook/{body['id']}", headers={"Authorization": f"Bearer {tok}"}).status_code == 200


def test_guestbook_validation(client):
    r = client.post("/api/guestbook", json={"nombre": "A", "mensaje": "corto"})
    assert r.status_code == 422
    r = client.post("/api/guestbook", json={"nombre": "Bot", "mensaje": "Mensaje spam largo", "website": "http://x"})
    assert r.status_code == 400


def test_contact_validation(client):
    r = client.post("/api/contact", json={"tema": "Otros", "asunto": "x", "nota": "ok"})
    assert r.status_code == 422
    r = client.post("/api/contact", json={"tema": "Inválido", "asunto": "Asunto", "nota": "Nota válida"})
    assert r.status_code == 422


def test_contact_honeypot_silently_ok(client):
    r = client.post("/api/contact", json={"tema": "Otros", "asunto": "Spam", "nota": "Spam spam", "website": "http://x"})
    assert r.status_code == 200 and r.json()["status"] == "ok" and "id" not in r.json()




@pytest.fixture(scope="module")
def token(client):
    r = client.post("/api/auth/login", json=ADMIN)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_auth_bad_password(client):
    r = client.post("/api/auth/login", json={"email": ADMIN["email"], "password": "nope"})
    assert r.status_code == 401


def test_auth_me_and_admin_guard(client, token):
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()["role"] == "admin"
    assert client.get("/api/admin/guestbook").status_code == 401
    assert client.get("/api/admin/guestbook", headers={"Authorization": "Bearer bad"}).status_code == 401


def test_moderation_hide_share_delete(client, token):
    h = {"Authorization": f"Bearer {token}"}
    created = client.post("/api/guestbook", json={"nombre": "Moderado", "mensaje": "Entrada para moderar."})
    if created.status_code == 429:
        pytest.skip("guestbook rate limit reached")
    eid = created.json()["id"]
    assert client.get(f"/api/guestbook/{eid}").status_code == 200
    assert client.patch(f"/api/admin/guestbook/{eid}", json={"hidden": True}, headers=h).json()["hidden"] is True
    assert client.get(f"/api/guestbook/{eid}").status_code == 404
    assert all(i["id"] != eid for i in client.get("/api/guestbook", params={"size": 50}).json()["items"])
    lst = client.get("/api/admin/guestbook", params={"filter": "hidden"}, headers=h).json()
    assert any(i["id"] == eid for i in lst["items"])
    # restore via hidden:false then confirm public visibility
    assert client.patch(f"/api/admin/guestbook/{eid}", json={"hidden": False}, headers=h).json()["hidden"] is False
    pub = client.get(f"/api/guestbook/{eid}")
    assert pub.status_code == 200
    body = pub.json()
    assert "email" not in body and "_id" not in body and body["id"] == eid
    # delete + second delete → 404
    assert client.delete(f"/api/admin/guestbook/{eid}", headers=h).json()["deleted"] is True
    assert client.delete(f"/api/admin/guestbook/{eid}", headers=h).status_code == 404


def test_songs_admin_crud_and_public_merge(client, token):
    h = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/admin/songs").status_code == 401
    assert client.post("/api/admin/upload/chunk", data={"upload_id": "x", "index": 0}).status_code == 401
    bad = client.post("/api/admin/songs", json={"title": "Mal", "section": "himnos", "group": "nope", "lyrics": "letra letra"}, headers=h)
    assert bad.status_code == 422
    r = client.post("/api/admin/songs", json={"title": "Canción Pytest", "section": "otras", "lyrics": "Uno\ndos\n\nTres\ncuatro", "notes": "n1\nn2"}, headers=h)
    assert r.status_code == 201, r.text
    s = r.json()
    assert s["slug"] == "cancionpytest" and s["stanzas"] == [["Uno", "dos"], ["Tres", "cuatro"]] and s["notes"] == ["n1", "n2"] and s["audio"] is None
    assert any(x["id"] == s["id"] for x in client.get("/api/songs").json())
    assert client.get(f"/api/songs/{s['id']}/audio").status_code == 404
    upd = client.put(f"/api/admin/songs/{s['id']}", json={"title": "Canción Pytest 2", "section": "pasoligero", "lyrics": "Solo una", "notes": ""}, headers=h)
    assert upd.status_code == 200 and upd.json()["section"] == "pasoligero"
    assert client.delete(f"/api/admin/songs/{s['id']}", headers=h).json()["deleted"] is True
    assert all(x["id"] != s["id"] for x in client.get("/api/songs").json())


def test_admin_filter_shapes(client, token):
    h = {"Authorization": f"Bearer {token}"}
    # Create an entry with email so admin view exposes it
    name = f"TEST_admin_{uuid.uuid4().hex[:6]}"
    r = client.post("/api/guestbook", json={"nombre": name, "mensaje": "Admin filter probe.", "email": "probe@example.com"})
    if r.status_code == 429:
        pytest.skip("guestbook rate limit reached")
    eid = r.json()["id"]
    try:
        for f in ("all", "visible", "hidden"):
            resp = client.get("/api/admin/guestbook", params={"filter": f, "size": 50}, headers=h)
            assert resp.status_code == 200
            body = resp.json()
            assert set(["total", "hidden", "items"]).issubset(body.keys())
        # Find our entry in "all" and confirm admin sees email
        allb = client.get("/api/admin/guestbook", params={"filter": "all", "size": 100}, headers=h).json()
        mine = next((i for i in allb["items"] if i["id"] == eid), None)
        assert mine is not None
        assert mine.get("email") == "probe@example.com"
    finally:
        client.delete(f"/api/admin/guestbook/{eid}", headers=h)
