import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Causacion, HistorialEntry, ApiConfig
from schemas import CausacionCreate, CausacionOut
from services.siigo import SiigoClient
from services.alegra import AlegraClient

router = APIRouter(prefix="/causaciones", tags=["causaciones"])


def _get_clients(db: Session):
    sc = db.query(ApiConfig).filter_by(platform="siigo").first()
    ac = db.query(ApiConfig).filter_by(platform="alegra").first()
    return (
        SiigoClient(sc.user_email if sc else "", sc.api_key if sc else "", sc.nit if sc else "", sc.env if sc else "prod"),
        AlegraClient(ac.user_email if ac else "", ac.api_key if ac else "", ac.nit if ac else "", ac.env if ac else "prod"),
    )


def _serialize(r: Causacion) -> dict:
    d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
    d["lineas"]     = json.loads(r.lineas or "[]")
    d["created_at"] = r.created_at.isoformat() if r.created_at else ""
    return d


# ─── List ─────────────────────────────────────────────────────────────────────
@router.get("/")
def list_causaciones(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    platform: str | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Causacion).order_by(Causacion.id.desc())
    if status:   q = q.filter(Causacion.status   == status)
    if platform: q = q.filter(Causacion.plataforma == platform)
    if search:   q = q.filter(Causacion.concepto.ilike(f"%{search}%"))
    total = q.count()
    items = q.offset(skip).limit(limit).all()
    return {"total": total, "skip": skip, "limit": limit, "items": [_serialize(r) for r in items]}


# ─── Create ───────────────────────────────────────────────────────────────────
@router.post("/", status_code=201)
async def create_causacion(payload: CausacionCreate, db: Session = Depends(get_db)):
    lineas = [l.model_dump() for l in payload.lineas]
    total_deb  = sum(l["debito"]  for l in lineas)
    total_cred = sum(l["credito"] for l in lineas)
    if abs(total_deb - total_cred) > 1:
        raise HTTPException(400, "El asiento no está cuadrado (débito ≠ crédito)")

    obj = Causacion(
        fecha=payload.fecha, concepto=payload.concepto,
        plataforma=payload.plataforma, lineas=json.dumps(lineas),
        total_debito=total_deb, total_credito=total_cred,
        status="pending", usuario=payload.usuario,
    )
    db.add(obj); db.commit(); db.refresh(obj)

    siigo, alegra = _get_clients(db)
    entry_data    = {"fecha": payload.fecha, "concepto": payload.concepto, "lineas": lineas}
    siigo_id = alegra_id = error_msg = None

    tasks = []
    if payload.plataforma in ("siigo",  "both"): tasks.append(("siigo",  siigo.create_journal_entry(entry_data)))
    if payload.plataforma in ("alegra", "both"): tasks.append(("alegra", alegra.create_journal_entry(entry_data)))

    for name, coro in tasks:
        try:
            res = await coro
            if name == "siigo": siigo_id  = res["id"]
            else:               alegra_id = res["id"]
        except Exception as e:
            error_msg = str(e)

    obj.siigo_id = siigo_id; obj.alegra_id = alegra_id
    obj.error_msg = error_msg
    obj.status    = "error" if error_msg else "ok"
    db.commit(); db.refresh(obj)

    now  = datetime.now()
    hist = HistorialEntry(
        fecha=now.strftime("%Y-%m-%d"), hora=now.strftime("%H:%M"),
        concepto=payload.concepto, tipo="Causación",
        cuentas=len(lineas), debito=total_deb, credito=total_cred,
        platform=payload.plataforma, status=obj.status, usuario=payload.usuario,
    )
    db.add(hist); db.commit()
    return _serialize(obj)


# ─── Get one ──────────────────────────────────────────────────────────────────
@router.get("/{causacion_id}")
def get_causacion(causacion_id: int, db: Session = Depends(get_db)):
    obj = db.query(Causacion).filter_by(id=causacion_id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    return _serialize(obj)


# ─── Update ───────────────────────────────────────────────────────────────────
@router.put("/{causacion_id}")
async def update_causacion(causacion_id: int, payload: CausacionCreate, db: Session = Depends(get_db)):
    obj = db.query(Causacion).filter_by(id=causacion_id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    lineas     = [l.model_dump() for l in payload.lineas]
    total_deb  = sum(l["debito"]  for l in lineas)
    total_cred = sum(l["credito"] for l in lineas)
    if abs(total_deb - total_cred) > 1:
        raise HTTPException(400, "El asiento no está cuadrado")
    obj.fecha = payload.fecha; obj.concepto = payload.concepto
    obj.plataforma = payload.plataforma; obj.lineas = json.dumps(lineas)
    obj.total_debito = total_deb; obj.total_credito = total_cred
    obj.status = "pending"; obj.error_msg = None
    db.commit(); db.refresh(obj)
    return _serialize(obj)


# ─── Delete ───────────────────────────────────────────────────────────────────
@router.delete("/{causacion_id}", status_code=204)
def delete_causacion(causacion_id: int, db: Session = Depends(get_db)):
    obj = db.query(Causacion).filter_by(id=causacion_id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    db.delete(obj); db.commit()
