import json
import asyncio
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Automatizacion, HistorialEntry
from schemas import AutoCreate, AutoOut, AutoToggle

router = APIRouter(prefix="/automatizaciones", tags=["automatizaciones"])


class AutoUpdate(BaseModel):
    name: str
    desc: str
    freq: str
    platform: str
    hora_ejecucion: str = "06:00"
    dia_mes: int | None = None
    concepto_plantilla: str = ""
    plantilla_lineas: list[dict] = []


# ─── List ─────────────────────────────────────────────────────────────────────
@router.get("/")
def list_autos(db: Session = Depends(get_db)):
    return db.query(Automatizacion).order_by(Automatizacion.id).all()


# ─── Create ───────────────────────────────────────────────────────────────────
@router.post("/", status_code=201)
def create_auto(payload: AutoUpdate, db: Session = Depends(get_db)):
    obj = Automatizacion(
        name=payload.name, desc=payload.desc, freq=payload.freq,
        platform=payload.platform, active=True,
        hora_ejecucion=payload.hora_ejecucion,
        dia_mes=payload.dia_mes,
        concepto_plantilla=payload.concepto_plantilla,
        plantilla_lineas=json.dumps(payload.plantilla_lineas),
        status="ok",
    )
    db.add(obj); db.commit(); db.refresh(obj)
    # Registrar en scheduler
    try:
        from scheduler import reschedule_automation
        reschedule_automation(obj.id, True, obj.freq, obj.hora_ejecucion, obj.dia_mes)
    except Exception:
        pass
    return obj


# ─── Update ───────────────────────────────────────────────────────────────────
@router.put("/{auto_id}")
def update_auto(auto_id: int, payload: AutoUpdate, db: Session = Depends(get_db)):
    obj = db.query(Automatizacion).filter_by(id=auto_id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    obj.name = payload.name; obj.desc = payload.desc
    obj.freq = payload.freq; obj.platform = payload.platform
    obj.hora_ejecucion = payload.hora_ejecucion
    obj.dia_mes = payload.dia_mes
    obj.concepto_plantilla = payload.concepto_plantilla
    obj.plantilla_lineas   = json.dumps(payload.plantilla_lineas)
    db.commit(); db.refresh(obj)
    try:
        from scheduler import reschedule_automation
        reschedule_automation(obj.id, obj.active, obj.freq, obj.hora_ejecucion, obj.dia_mes)
    except Exception:
        pass
    return obj


# ─── Delete ───────────────────────────────────────────────────────────────────
@router.delete("/{auto_id}", status_code=204)
def delete_auto(auto_id: int, db: Session = Depends(get_db)):
    obj = db.query(Automatizacion).filter_by(id=auto_id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    try:
        from scheduler import scheduler
        scheduler.remove_job(f"auto_{auto_id}")
    except Exception:
        pass
    db.delete(obj); db.commit()


# ─── Toggle ───────────────────────────────────────────────────────────────────
@router.patch("/{auto_id}/toggle")
def toggle_auto(auto_id: int, payload: AutoToggle, db: Session = Depends(get_db)):
    obj = db.query(Automatizacion).filter_by(id=auto_id).first()
    if not obj: raise HTTPException(404, "No encontrado")
    obj.active = payload.active
    db.commit(); db.refresh(obj)
    try:
        from scheduler import reschedule_automation
        reschedule_automation(obj.id, obj.active, obj.freq, obj.hora_ejecucion, obj.dia_mes)
    except Exception:
        pass
    return obj


# ─── Run now ──────────────────────────────────────────────────────────────────
@router.post("/{auto_id}/run")
async def run_now(auto_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    obj = db.query(Automatizacion).filter_by(id=auto_id).first()
    if not obj:       raise HTTPException(404, "No encontrado")
    if not obj.active: raise HTTPException(400, "Automatización pausada")
    background_tasks.add_task(_execute, auto_id)
    return {"message": f'"{obj.name}" iniciada', "auto_id": auto_id}


async def _execute(auto_id: int):
    from scheduler import _run_automation
    await _run_automation(auto_id)
