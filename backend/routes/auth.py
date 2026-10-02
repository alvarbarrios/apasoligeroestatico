"""Single-owner auth: bcrypt-hashed admin seeded from .env, JWT access tokens (Bearer or cookie)."""
import os
import time
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr

JWT_ALGORITHM = "HS256"
ACCESS_MINUTES = 12 * 60  # owner session: 12h
MAX_ATTEMPTS, LOCK_SECONDS = 5, 15 * 60

router = APIRouter(prefix="/auth", tags=["auth"])
_db = None


def require_admin_credentials() -> tuple[str, str]:
    email = (os.environ.get("ADMIN_EMAIL") or "").strip()
    password = (os.environ.get("ADMIN_PASSWORD") or "").strip()
    if not email or not password:
        raise RuntimeError("ADMIN_EMAIL y ADMIN_PASSWORD deben configurarse en el entorno antes de usar autenticación de admin.")
    return email.lower(), password


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET debe configurarse en el entorno antes de emitir tokens.")
    return secret


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MINUTES)}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


async def seed_admin(db):
    global _db
    _db = db
    email, password = require_admin_credentials()
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({"email": email, "password_hash": hash_password(password), "name": "Autor",
                                   "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()})
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesión expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await _db.users.find_one({"email": payload.get("email")}, {"_id": 0, "password_hash": 0})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def _ip(request: Request) -> str:
    # Uvicorn resolves forwarded headers only from configured trusted proxies.
    return request.client.host if request.client and request.client.host else "unknown"


@router.post("/login")
async def login(payload: LoginIn, request: Request):
    email = payload.email.lower()
    identifier = f"{_ip(request)}:{email}"
    now = time.time()
    attempt = await _db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= MAX_ATTEMPTS and now - attempt.get("last", 0) < LOCK_SECONDS:
        raise HTTPException(status_code=429, detail="Demasiados intentos. Espere 15 minutos.")
    user = await _db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        count = 1 if not attempt or now - attempt.get("last", 0) >= LOCK_SECONDS else attempt["count"] + 1
        await _db.login_attempts.update_one({"identifier": identifier}, {"$set": {"count": count, "last": now}}, upsert=True)
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    await _db.login_attempts.delete_one({"identifier": identifier})
    token = create_access_token(str(user.get("_id")), email)
    return {"access_token": token, "token_type": "bearer", "user": {"email": email, "name": user.get("name"), "role": user.get("role")}}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return user
