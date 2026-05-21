from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import HistorialEntry
from schemas import HistorialOut

router = APIRouter(prefix="/historial", tags=["historial"])


@router.get("/")
def list_historial(
    status: str | None = Query(None),
    platform: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(HistorialEntry).order_by(HistorialEntry.id.desc())
    if status:
        q = q.filter(HistorialEntry.status == status)
    if platform:
        q = q.filter(HistorialEntry.platform == platform)
    if search:
        q = q.filter(HistorialEntry.concepto.ilike(f"%{search}%"))
    total = q.count()
    items = q.offset(skip).limit(limit).all()
    return {"total": total, "skip": skip, "limit": limit, "items": [
        {c.name: getattr(r, c.name) for c in r.__table__.columns}
        for r in items
    ]}


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total = db.query(func.count(HistorialEntry.id)).scalar() or 0
    total_debito = db.query(func.sum(HistorialEntry.debito)).scalar() or 0
    errors = db.query(func.count(HistorialEntry.id)).filter_by(status="error").scalar() or 0
    pending = db.query(func.count(HistorialEntry.id)).filter_by(status="pending").scalar() or 0
    return {
        "total_asientos": total,
        "total_causado": total_debito,
        "errores": errors,
        "pendientes": pending,
    }
