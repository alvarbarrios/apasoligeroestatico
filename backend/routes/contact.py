"""Contact form -> owner inbox via managed email. Recipient + template are server-side (G4)."""
import os
import time
from html import escape
from typing import Literal, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, EmailStr

from services.email import send_email, EMAIL_FROM_NAME

router = APIRouter(prefix="/contact", tags=["contact"])

CONTACT_TO_EMAIL = (os.environ.get("CONTACT_TO_EMAIL") or "").strip()
if not CONTACT_TO_EMAIL:
    raise RuntimeError("CONTACT_TO_EMAIL debe configurarse en el entorno antes de enviar mensajes de contacto.")

_RATE: dict[str, list[float]] = {}
_LIMIT, _WINDOW = 5, 3600  # 5 messages / hour / ip
_MAX_RATE_KEYS = 2048


def get_client_ip(request: Request) -> str:
    # Uvicorn resolves forwarded headers only from configured trusted proxies.
    return request.client.host if request.client and request.client.host else "unknown"


class ContactIn(BaseModel):
    tema: Literal["Pedir Canción", "Enviar Canción", "Sugerencia", "Otros"]
    asunto: str = Field(min_length=2, max_length=150)
    nota: str = Field(min_length=5, max_length=5000)
    nombre: str = Field(default="", max_length=120)
    email: Optional[EmailStr] = None
    tel: str = Field(default="", max_length=40)
    uco: str = Field(default="", max_length=120)
    website: str = Field(default="", max_length=200)  # honeypot


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


def _row(label: str, value: str) -> str:
    return (f'<tr><td style="padding:6px 12px 6px 0;font-family:monospace;font-size:11px;'
            f'letter-spacing:.15em;text-transform:uppercase;color:#8a9a7b;vertical-align:top">{label}</td>'
            f'<td style="padding:6px 0;font-family:Arial,sans-serif;font-size:14px;color:#e8e2d0">{value or "—"}</td></tr>')


def _template(c: ContactIn) -> str:
    nota_html = escape(c.nota).replace("\n", "<br>")
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070907;padding:32px 0">'
        '<tr><td align="center">'
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#101610;border:1px solid #3a4a36">'
        '<tr><td style="padding:20px 28px;border-bottom:1px solid #3a4a36">'
        f'<p style="margin:0;font-family:monospace;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#d4a359">Transmisión recibida // {escape(EMAIL_FROM_NAME)}</p>'
        f'<h1 style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:22px;text-transform:uppercase;color:#f3eddc">{escape(c.tema)}: {escape(c.asunto)}</h1>'
        '</td></tr>'
        '<tr><td style="padding:24px 28px">'
        f'<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#e8e2d0">{nota_html}</p>'
        '<table role="presentation" cellpadding="0" cellspacing="0" style="border-top:1px solid #3a4a36;padding-top:12px">'
        + _row("Nombre", escape(c.nombre)) + _row("E-mail", escape(c.email or "")) + _row("Tel", escape(c.tel)) + _row("UCO", escape(c.uco)) +
        '</table></td></tr>'
        '<tr><td style="padding:14px 28px;border-top:1px solid #3a4a36">'
        f'<p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#8a9a7b">Enviado desde el formulario de contacto de {escape(EMAIL_FROM_NAME)}</p>'
        '</td></tr></table></td></tr></table>'
    )


@router.post("")
async def submit_contact(payload: ContactIn, request: Request):
    if payload.website:  # bot filled the honeypot
        return {"status": "ok"}
    ip = get_client_ip(request)
    if _rate_limited(ip):
        raise HTTPException(status_code=429, detail="Demasiadas transmisiones. Inténtelo más tarde.")
    subject = f"[A Paso Ligero] {payload.tema}: {payload.asunto}"
    email_id = await send_email(
        to=CONTACT_TO_EMAIL,
        subject=subject,
        html=_template(payload),
        reply_to=str(payload.email) if payload.email else None,
    )
    return {"status": "ok", "id": email_id}
