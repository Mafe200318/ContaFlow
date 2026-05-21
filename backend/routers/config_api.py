import os
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import ApiConfig
from schemas import ApiConfigIn, ApiConfigOut, SyncResult
from services.siigo import SiigoClient
from services.alegra import AlegraClient

router = APIRouter(prefix="/config", tags=["config"])

# Valores por defecto desde .env
_DEFAULTS = {
    "siigo":  {"email": os.getenv("SIIGO_EMAIL",""),  "key": os.getenv("SIIGO_API_KEY",""),  "nit": os.getenv("SIIGO_NIT",""),  "env": os.getenv("SIIGO_ENV","sandbox")},
    "alegra": {"email": os.getenv("ALEGRA_EMAIL",""), "key": os.getenv("ALEGRA_TOKEN",""),   "nit": os.getenv("ALEGRA_NIT",""), "env": os.getenv("ALEGRA_ENV","prod")},
}


def _get_or_create(db: Session, platform: str) -> ApiConfig:
    obj = db.query(ApiConfig).filter_by(platform=platform).first()
    if not obj:
        d = _DEFAULTS.get(platform, {})
        obj = ApiConfig(
            platform=platform,
            user_email=d.get("email",""),
            api_key=d.get("key",""),
            nit=d.get("nit",""),
            env=d.get("env","prod"),
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
    return obj


def _mask_key(key: str) -> str:
    if not key:
        return ""
    if key.startswith("•"):
        return key
    return "•" * min(len(key), 20)


# ── Non-wildcard routes first (must precede /{platform}) ─────────────────────

@router.put("/sync-prefs")
def save_sync_prefs(
    sync_freq: str = Query(default="daily"),
    sync_hour: str = Query(default="06:00"),
    db: Session = Depends(get_db),
):
    """Actualiza frecuencia y hora de sync para ambas plataformas."""
    for platform in ("siigo", "alegra"):
        obj = _get_or_create(db, platform)
        obj.sync_freq = sync_freq
        obj.sync_hour = sync_hour
    db.commit()
    return {"sync_freq": sync_freq, "sync_hour": sync_hour, "updated": ["siigo", "alegra"]}


@router.post("/sync/all", response_model=list[SyncResult])
async def sync_all(db: Session = Depends(get_db)):
    results = []
    for platform in ("siigo", "alegra"):
        obj = _get_or_create(db, platform)
        try:
            if platform == "siigo":
                client = SiigoClient(obj.user_email, obj.api_key, obj.nit, obj.env)
                invoices = await client.get_invoices()
            else:
                client = AlegraClient(obj.user_email, obj.api_key, obj.nit, obj.env)
                invoices = await client.get_invoices()

            obj.connected   = True
            obj.last_tested = datetime.now().strftime("%Y-%m-%d %H:%M")
            db.commit()

            demo_tag = " [DEMO]" if not obj.api_key else ""
            results.append(SyncResult(
                platform=platform, success=True,
                synced=len(invoices),
                message=f"{len(invoices)} registros sincronizados desde {platform.title()}{demo_tag}",
            ))
        except Exception as e:
            results.append(SyncResult(platform=platform, success=False, synced=0, message=str(e)))
    return results


# ── Wildcard /{platform} routes (must come AFTER specific paths) ──────────────

@router.get("/{platform}", response_model=ApiConfigOut)
def get_config(platform: str, db: Session = Depends(get_db)):
    obj = _get_or_create(db, platform)
    out = {
        "platform":   obj.platform,
        "user_email": obj.user_email,
        "api_key":    _mask_key(obj.api_key),
        "nit":        obj.nit,
        "env":        obj.env,
        "connected":  obj.connected,
        "last_tested":obj.last_tested,
        "sync_freq":  obj.sync_freq,
        "sync_hour":  obj.sync_hour,
    }
    return out


@router.put("/{platform}", response_model=ApiConfigOut)
def save_config(platform: str, payload: ApiConfigIn, db: Session = Depends(get_db)):
    obj = _get_or_create(db, platform)
    obj.user_email = payload.user_email
    obj.nit        = payload.nit
    obj.env        = payload.env
    obj.sync_freq  = payload.sync_freq
    obj.sync_hour  = payload.sync_hour
    # Solo actualiza la key si no es una máscara
    if payload.api_key and not payload.api_key.startswith("•"):
        obj.api_key = payload.api_key
    db.commit()
    db.refresh(obj)
    out = {
        "platform":   obj.platform,
        "user_email": obj.user_email,
        "api_key":    _mask_key(obj.api_key),
        "nit":        obj.nit,
        "env":        obj.env,
        "connected":  obj.connected,
        "last_tested":obj.last_tested,
        "sync_freq":  obj.sync_freq,
        "sync_hour":  obj.sync_hour,
    }
    return out


@router.post("/{platform}/test", response_model=SyncResult)
async def test_connection(platform: str, db: Session = Depends(get_db)):
    obj = _get_or_create(db, platform)
    try:
        if platform == "siigo":
            client = SiigoClient(obj.user_email, obj.api_key, obj.nit, obj.env)
        else:
            client = AlegraClient(obj.user_email, obj.api_key, obj.nit, obj.env)

        res = await client.test_connection()
        obj.connected  = res["ok"]
        obj.last_tested = datetime.now().strftime("%Y-%m-%d %H:%M")
        db.commit()
        return SyncResult(platform=platform, success=res["ok"], synced=0, message=res["message"])
    except Exception as e:
        obj.connected = False
        db.commit()
        return SyncResult(platform=platform, success=False, synced=0, message=str(e))
