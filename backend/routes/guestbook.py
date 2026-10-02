"""Native Libro de Visitas — MongoDB backed guestbook."""
import time
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, Field, EmailStr

router = APIRouter(prefix="/guestbook", tags=["guestbook"])

_RATE: dict[str, list[float]] = {}
_LIMIT, _WINDOW = 3, 3600  # 3 firmas / hora / ip
_MAX_RATE_KEYS = 2048


def get_client_ip(request: Request) -> str:
    # Uvicorn resolves forwarded headers only from configured trusted proxies.
    return request.client.host if request.client and request.client.host else "unknown"


class EntryIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=80)
    lugar: str = Field(default="", max_length=80)
    uco: str = Field(default="", max_length=120)
    mensaje: str = Field(min_length=5, max_length=1500)
    email: Optional[EmailStr] = None  # never published
    website: str = Field(default="", max_length=200)  # honeypot


class Entry(BaseModel):
    id: str
    nombre: str
    lugar: str
    uco: str
    mensaje: str
    created_at: str


def _rate_limited(ip: str) -> bool:
    now = time.time()
    for key in list(_RATE):
        hits = [timestamp for timestamp in _RATE[key] if now - timestamp < _WINDOW]
        if hits:
            _RATE[key] = hits
        else:
            _RATE.pop(key, None)
    key = ip
    if key not in _RATE and len(_RATE) >= _MAX_RATE_KEYS - 1:
        key = "__overflow__"
    hits = _RATE.get(key, [])
    _RATE[key] = hits
    if len(hits) >= _LIMIT:
        return True
    hits.append(now)
    _RATE[key] = hits
    return False


def _public(doc: dict) -> Entry:
    return Entry(id=doc["id"], nombre=doc["nombre"], lugar=doc.get("lugar", ""), uco=doc.get("uco", ""),
                 mensaje=doc["mensaje"], created_at=doc["created_at"])


def make_router(db):
    PUBLIC = {"hidden": {"$ne": True}}

    @router.get("")
    async def list_entries(page: int = Query(1, ge=1), size: int = Query(12, ge=1, le=50)):
        total = await db.guestbook.count_documents(PUBLIC)
        cursor = db.guestbook.find(PUBLIC, {"_id": 0}).sort("created_at", -1).skip((page - 1) * size).limit(size)
        docs = await cursor.to_list(size)
        return {"total": total, "page": page, "size": size, "items": [_public(d) for d in docs]}

    @router.get("/{entry_id}")
    async def get_entry(entry_id: str):
        doc = await db.guestbook.find_one({"id": entry_id, **PUBLIC}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Firma no encontrada")
        return _public(doc)

    @router.post("", status_code=201)
    async def create_entry(payload: EntryIn, request: Request):
        if payload.website:
            raise HTTPException(status_code=400, detail="Firma rechazada")
        ip = get_client_ip(request)
        if _rate_limited(ip):
            raise HTTPException(status_code=429, detail="Demasiadas firmas. Inténtelo más tarde.")
        doc = {
            "id": str(uuid.uuid4()),
            "nombre": payload.nombre.strip(),
            "lugar": payload.lugar.strip(),
            "uco": payload.uco.strip(),
            "mensaje": payload.mensaje.strip(),
            "email": str(payload.email) if payload.email else "",
            "hidden": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.guestbook.insert_one(doc)
        return _public(doc)

    return router
