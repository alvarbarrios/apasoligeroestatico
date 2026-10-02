"""Backend tests for Songs feature: public list, admin CRUD, chunked upload, audio stream."""
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
        pytest.fail("ADMIN_EMAIL y ADMIN_PASSWORD deben configurarse para ejecutar las pruebas de canciones.")
    return {"email": email, "password": password}


ADMIN = require_admin_credentials()
MP3 = os.environ.get("TEST_AUDIO_FILE")
CHUNK = 500 * 1024  # 500 KB


@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BASE, timeout=120) as c:
        yield c


@pytest.fixture(scope="module")
def token(client):
    r = client.post("/api/auth/login", json=ADMIN)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_public_songs_listing(client):
    r = client.get("/api/songs")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    for s in body:
        for k in ("id", "slug", "title", "section", "stanzas", "notes", "date", "audio", "audio_name", "file_id", "created_at"):
            assert k in s, f"missing {k}"


def test_admin_requires_auth(client):
    assert client.get("/api/admin/songs").status_code == 401
    assert client.post("/api/admin/upload/chunk", data={"upload_id": "x", "index": 0}).status_code == 401
    assert client.post("/api/admin/upload/complete", data={"upload_id": "x", "filename": "x.mp3", "total": 1}).status_code == 401


def test_validation_himnos_group(client, auth):
    r = client.post("/api/admin/songs", json={"title": "Himno Mal", "section": "himnos", "group": "nope",
                                              "lyrics": "linea uno"}, headers=auth)
    assert r.status_code == 422


def test_validation_bad_extension(client, auth):
    uid = str(uuid.uuid4())
    data = b"hello world"
    r = client.post("/api/admin/upload/chunk",
                    data={"upload_id": uid, "index": "0"},
                    files={"chunk": ("a.txt", data, "text/plain")}, headers=auth)
    assert r.status_code == 200
    r = client.post("/api/admin/upload/complete",
                    data={"upload_id": uid, "filename": "a.txt", "total": "1"}, headers=auth)
    assert r.status_code == 400


def test_complete_mismatched_total(client, auth):
    uid = str(uuid.uuid4())
    r = client.post("/api/admin/upload/chunk",
                    data={"upload_id": uid, "index": "0"},
                    files={"chunk": ("a.mp3", b"abc", "audio/mpeg")}, headers=auth)
    assert r.status_code == 200
    r = client.post("/api/admin/upload/complete",
                    data={"upload_id": uid, "filename": "a.mp3", "total": "5"}, headers=auth)
    assert r.status_code == 400


@pytest.fixture(scope="module")
def uploaded(client, auth):
    """Upload the real quienes.mp3 in chunks."""
    if not MP3 or not os.path.isfile(MP3):
        pytest.fail("TEST_AUDIO_FILE debe apuntar a un MP3 local para ejecutar la prueba de carga.")
    uid = str(uuid.uuid4())
    data = open(MP3, "rb").read()
    chunks = [data[i:i + CHUNK] for i in range(0, len(data), CHUNK)]
    for idx, c in enumerate(chunks):
        r = client.post("/api/admin/upload/chunk",
                        data={"upload_id": uid, "index": str(idx)},
                        files={"chunk": (f"part{idx}", c, "application/octet-stream")}, headers=auth)
        assert r.status_code == 200, r.text
    r = client.post("/api/admin/upload/complete",
                    data={"upload_id": uid, "filename": "quienes.mp3", "total": str(len(chunks))}, headers=auth)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["size"] == len(data)
    return {"file_id": body["file_id"], "size": len(data)}


def test_full_song_lifecycle(client, auth, uploaded):
    # Create song with audio
    payload = {"title": "TESTAgent Quienes", "section": "otras",
               "lyrics": "a\nb\n\nc", "notes": "", "file_id": uploaded["file_id"]}
    r = client.post("/api/admin/songs", json=payload, headers=auth)
    assert r.status_code == 201, r.text
    s = r.json()
    sid = s["id"]
    assert s["stanzas"] == [["a", "b"], ["c"]]
    assert s["audio"] == f"/api/songs/{sid}/audio"
    assert s["audio_name"] == "quienes.mp3"

    # Public list includes it
    pub = client.get("/api/songs").json()
    assert any(x["id"] == sid for x in pub)

    # Audio stream OK + size matches
    ar = client.get(f"/api/songs/{sid}/audio")
    assert ar.status_code == 200
    assert ar.headers.get("content-type", "").startswith("audio/")
    assert len(ar.content) == uploaded["size"]
    partial = client.get(f"/api/songs/{sid}/audio", headers={"Range": "bytes=0-9"})
    assert partial.status_code == 206
    assert partial.content == ar.content[:10]
    assert partial.headers.get("content-range") == f"bytes 0-9/{uploaded['size']}"
    suffix = client.get(f"/api/songs/{sid}/audio", headers={"Range": "bytes=-10"})
    assert suffix.status_code == 206 and suffix.content == ar.content[-10:]
    oversized_suffix = client.get(f"/api/songs/{sid}/audio", headers={"Range": f"bytes=-{uploaded['size'] + 1}"})
    assert oversized_suffix.status_code == 206 and oversized_suffix.content == ar.content
    assert client.get(f"/api/songs/{sid}/audio", headers={"Range": "bytes=-0"}).status_code == 416
    assert client.get(f"/api/songs/{sid}/audio", headers={"Range": f"bytes={uploaded['size']}-"}).status_code == 416
    assert client.get(f"/api/songs/{sid}/audio", headers={"Range": "bytes=10-0"}).status_code == 416
    assert client.get(f"/api/songs/{sid}/audio", headers={"Range": "bytes=0-1,3-4"}).status_code == 416
    assert client.get(f"/api/songs/{sid}/audio", headers={"Range": f"bytes={'9' * 10000}-"}).status_code == 416

    # Slug collision — create another same title
    r2 = client.post("/api/admin/songs", json=payload, headers=auth)
    assert r2.status_code == 201
    s2 = r2.json()
    assert s2["slug"] != s["slug"]
    assert s2["slug"].startswith("testagentquienes")

    # Delete both
    assert client.delete(f"/api/admin/songs/{sid}", headers=auth).json()["deleted"] is True
    assert client.delete(f"/api/admin/songs/{s2['id']}", headers=auth).json()["deleted"] is True

    # After delete: not in public list, audio 404
    pub2 = client.get("/api/songs").json()
    assert all(x["id"] != sid for x in pub2)
    assert client.get(f"/api/songs/{sid}/audio").status_code == 404
