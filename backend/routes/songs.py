"""Owner-added songs: public listing + audio streaming, admin CRUD with chunked MP3 upload."""
import os
import re
import shutil
import unicodedata
import uuid
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, Field

from routes.auth import get_current_user
from services.storage import APP_NAME, get_object, put_object

public = APIRouter(prefix="/songs", tags=["songs"])
admin = APIRouter(prefix="/admin/songs", tags=["admin"], dependencies=[Depends(get_current_user)])
upload = APIRouter(prefix="/admin/upload", tags=["admin"], dependencies=[Depends(get_current_user)])

TMP = Path("/tmp/apl_uploads")
MAX_AUDIO = 25 * 1024 * 1024
MAX_AUDIO_CACHE_BYTES = 50 * 1024 * 1024
MAX_AUDIO_CACHE_ENTRIES = 16
HIMNOS_GROUPS = {"aire", "armada", "cucos", "espana", "gcivil", "greal", "tierra", "ume", "varios"}
_audio_cache: OrderedDict[str, tuple[bytes, str]] = OrderedDict()
_audio_cache_bytes = 0


MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]


def fecha_registro() -> str:
    now = datetime.now(timezone.utc)
    return f"{now.day:02d}{MESES[now.month - 1]}{now.strftime('%y')}"


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "", s)[:40] or uuid.uuid4().hex[:8]


def parse_lyrics(text: str) -> list[list[str]]:
    blocks = re.split(r"\n\s*\n", text.strip().replace("\r", ""))
    return [[l.strip() for l in b.split("\n") if l.strip()] for b in blocks if b.strip()]


class SongIn(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    section: Literal["pasoligero", "otras", "himnos"]
    group: Optional[str] = None
    lyrics: str = Field(min_length=5, max_length=20000)
    notes: str = Field(default="", max_length=2000)
    file_id: Optional[str] = None


def _public(doc: dict) -> dict:
    return {
        "id": doc["id"], "slug": doc["slug"], "title": doc["title"], "section": doc["section"], "group": doc.get("group"),
        "stanzas": doc["stanzas"], "notes": doc.get("notes", []), "date": doc["date"],
        "audio": f"/api/songs/{doc['id']}/audio" if doc.get("file_id") else None,
        "audio_name": doc.get("audio_name"), "file_id": doc.get("file_id"), "created_at": doc["created_at"],
    }


def _cache_audio(path: str, data: bytes, content_type: str) -> None:
    global _audio_cache_bytes
    if len(data) > MAX_AUDIO_CACHE_BYTES:
        return
    cached = _audio_cache.pop(path, None)
    if cached:
        _audio_cache_bytes -= len(cached[0])
    while _audio_cache and (
        len(_audio_cache) >= MAX_AUDIO_CACHE_ENTRIES
        or _audio_cache_bytes + len(data) > MAX_AUDIO_CACHE_BYTES
    ):
        _, (evicted, _) = _audio_cache.popitem(last=False)
        _audio_cache_bytes -= len(evicted)
    _audio_cache[path] = (data, content_type)
    _audio_cache_bytes += len(data)


def make_routers(db):
    async def _file(file_id: str):
        return await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})

    @public.get("")
    async def list_songs():
        docs = await db.songs.find({"is_deleted": False}, {"_id": 0}).sort("created_at", 1).to_list(1000)
        return [_public(d) for d in docs]

    @public.get("/{song_id}/audio")
    async def stream_audio(song_id: str, request: Request):
        song = await db.songs.find_one({"id": song_id, "is_deleted": False}, {"_id": 0})
        if not song or not song.get("file_id"):
            raise HTTPException(status_code=404, detail="Audio no encontrado")
        rec = await _file(song["file_id"])
        if not rec:
            raise HTTPException(status_code=404, detail="Audio no encontrado")
        path = rec["storage_path"]
        if path not in _audio_cache:
            data, ct = await get_object(rec["storage_path"])
            if len(data) > MAX_AUDIO:
                raise HTTPException(status_code=413, detail="El audio supera los 25 MB")
            ct = rec.get("content_type") or ct
            _cache_audio(path, data, ct)
        else:
            data, ct = _audio_cache.pop(path)
            _audio_cache[path] = (data, ct)
        data, ct = _audio_cache[path]
        size = len(data)
        headers = {"Cache-Control": "public, max-age=86400", "Accept-Ranges": "bytes"}
        rng = request.headers.get("range")
        if rng and rng.startswith("bytes=") and len(rng) > 64:
            raise HTTPException(status_code=416, detail="Rango no satisfactorio", headers={"Content-Range": f"bytes */{size}"})
        m = re.fullmatch(r"bytes=(\d*)-(\d*)", rng or "")
        if m and (m.group(1) or m.group(2)):
            if not size:
                raise HTTPException(status_code=416, detail="Rango no satisfactorio", headers={"Content-Range": "bytes */0"})
            if m.group(1):
                start = int(m.group(1))
            else:
                suffix_size = int(m.group(2))
                if suffix_size == 0:
                    raise HTTPException(status_code=416, detail="Rango no satisfactorio", headers={"Content-Range": f"bytes */{size}"})
                start = max(0, size - suffix_size)
            end = min(int(m.group(2)), size - 1) if m.group(1) and m.group(2) else size - 1
            if start >= size or start > end:
                raise HTTPException(status_code=416, detail="Rango no satisfactorio", headers={"Content-Range": f"bytes */{size}"})
            headers["Content-Range"] = f"bytes {start}-{end}/{size}"
            return Response(content=data[start:end + 1], status_code=206, media_type=ct, headers=headers)
        if rng and "," in rng:
            raise HTTPException(status_code=416, detail="Solo se admite un rango de bytes", headers={"Content-Range": f"bytes */{size}"})
        return Response(content=data, media_type=ct, headers=headers)

    # ---- chunked upload -------------------------------------------------
    @upload.post("/chunk")
    async def upload_chunk(upload_id: str = Form(...), index: int = Form(...), chunk: UploadFile = File(...)):
        if not re.fullmatch(r"[a-f0-9-]{8,64}", upload_id):
            raise HTTPException(status_code=400, detail="upload_id inválido")
        if index < 0:
            raise HTTPException(status_code=400, detail="Índice de fragmento inválido")
        d = TMP / upload_id
        d.mkdir(parents=True, exist_ok=True)
        data = await chunk.read(MAX_AUDIO + 1)
        if len(data) > MAX_AUDIO:
            shutil.rmtree(d, ignore_errors=True)
            raise HTTPException(status_code=413, detail="El audio supera los 25 MB")
        (d / f"{index:05d}.part").write_bytes(data)
        size = sum(p.stat().st_size for p in d.glob("*.part"))
        if size > MAX_AUDIO:
            shutil.rmtree(d, ignore_errors=True)
            raise HTTPException(status_code=413, detail="El audio supera los 25 MB")
        return {"upload_id": upload_id, "index": index, "received": size}

    @upload.post("/complete")
    async def upload_complete(upload_id: str = Form(...), filename: str = Form(...), total: int = Form(...), user=Depends(get_current_user)):
        d = TMP / upload_id
        parts = sorted(d.glob("*.part")) if d.exists() else []
        if len(parts) != total:
            raise HTTPException(status_code=400, detail=f"Faltan fragmentos ({len(parts)}/{total})")
        data = b"".join(p.read_bytes() for p in parts)
        shutil.rmtree(d, ignore_errors=True)
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "mp3"
        if ext not in ("mp3", "m4a", "ogg", "wav"):
            raise HTTPException(status_code=400, detail="Formato no admitido (mp3, m4a, ogg, wav)")
        ct = {"mp3": "audio/mpeg", "m4a": "audio/mp4", "ogg": "audio/ogg", "wav": "audio/wav"}[ext]
        path = f"{APP_NAME}/uploads/{slugify(user['email'])}/{uuid.uuid4()}.{ext}"
        try:
            result = await put_object(path, data, ct)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"No se pudo guardar el audio: {e}")
        rec = {"id": str(uuid.uuid4()), "storage_path": result["path"], "original_filename": filename, "content_type": ct,
               "size": result.get("size", len(data)), "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()}
        await db.files.insert_one(dict(rec))
        return {"file_id": rec["id"], "filename": filename, "size": rec["size"]}

    # ---- admin songs ----------------------------------------------------
    async def _validate(payload: SongIn):
        if payload.section == "himnos" and payload.group not in HIMNOS_GROUPS:
            raise HTTPException(status_code=422, detail="Grupo de himnos inválido")
        if payload.file_id and not await _file(payload.file_id):
            raise HTTPException(status_code=422, detail="Archivo de audio no encontrado")

    @admin.get("")
    async def admin_list():
        docs = await db.songs.find({"is_deleted": False}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        return [_public(d) for d in docs]

    @admin.post("", status_code=201)
    async def create_song(payload: SongIn):
        await _validate(payload)
        base = slugify(payload.title)
        slug, n = base, 2
        while await db.songs.find_one({"slug": slug, "section": payload.section, "is_deleted": False}):
            slug, n = f"{base}{n}", n + 1
        rec = await _file(payload.file_id) if payload.file_id else None
        doc = {
            "id": str(uuid.uuid4()), "slug": slug, "title": payload.title.strip(), "section": payload.section,
            "group": payload.group if payload.section == "himnos" else None,
            "stanzas": parse_lyrics(payload.lyrics), "notes": [n.strip() for n in payload.notes.split("\n") if n.strip()],
            "file_id": payload.file_id, "audio_name": rec["original_filename"] if rec else None,
            "date": fecha_registro(),
            "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.songs.insert_one(dict(doc))
        return _public(doc)

    @admin.put("/{song_id}")
    async def update_song(song_id: str, payload: SongIn):
        await _validate(payload)
        song = await db.songs.find_one({"id": song_id, "is_deleted": False}, {"_id": 0})
        if not song:
            raise HTTPException(status_code=404, detail="Canción no encontrada")
        rec = await _file(payload.file_id) if payload.file_id else None
        upd = {
            "title": payload.title.strip(), "section": payload.section, "group": payload.group if payload.section == "himnos" else None,
            "stanzas": parse_lyrics(payload.lyrics), "notes": [n.strip() for n in payload.notes.split("\n") if n.strip()],
            "file_id": payload.file_id, "audio_name": rec["original_filename"] if rec else None,
        }
        await db.songs.update_one({"id": song_id}, {"$set": upd})
        return _public({**song, **upd})

    @admin.delete("/{song_id}")
    async def delete_song(song_id: str):
        song = await db.songs.find_one({"id": song_id, "is_deleted": False}, {"_id": 0})
        if not song:
            raise HTTPException(status_code=404, detail="Canción no encontrada")
        await db.songs.update_one({"id": song_id}, {"$set": {"is_deleted": True}})
        if song.get("file_id"):
            await db.files.update_one({"id": song["file_id"]}, {"$set": {"is_deleted": True}})
        return {"id": song_id, "deleted": True}

    return public, admin, upload
