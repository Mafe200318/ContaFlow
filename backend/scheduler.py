"""
APScheduler — ejecuta automatizaciones en segundo plano según su frecuencia.
Se inicia junto con FastAPI (lifespan).
"""
import json
import random
import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from database import SessionLocal
from models import Automatizacion, HistorialEntry

scheduler = AsyncIOScheduler(timezone="America/Bogota")


async def _run_automation(auto_id: int):
    """Ejecuta una automatización y registra en historial."""
    db = SessionLocal()
    try:
        auto = db.query(Automatizacion).filter_by(id=auto_id).first()
        if not auto or not auto.active:
            return

        now = datetime.now()
        lineas = json.loads(auto.plantilla_lineas or "[]")
        total = sum(l.get("debito", 0) for l in lineas) if lineas else random.randint(500_000, 10_000_000)

        # En producción aquí iría la llamada real a Siigo/Alegra
        await asyncio.sleep(0.5)

        auto.last_run      = now.strftime("%Y-%m-%d %H:%M")
        auto.entries_count = (auto.entries_count or 0) + max(len(lineas), 1)
        auto.status        = "ok"
        db.commit()

        hist = HistorialEntry(
            fecha    = now.strftime("%Y-%m-%d"),
            hora     = now.strftime("%H:%M"),
            concepto = auto.concepto_plantilla or auto.name,
            tipo     = "Automatización",
            cuentas  = len(lineas) or 2,
            debito   = total,
            credito  = total,
            platform = auto.platform,
            status   = "ok",
            usuario  = "Sistema",
        )
        db.add(hist)
        db.commit()
        print(f"[Scheduler] '{auto.name}' ejecutada OK — {now.strftime('%H:%M')}")

        # Notificación de éxito (solo si está configurado NOTIFY_EMAIL)
        try:
            from services.email_service import notify_automation_success
            notify_automation_success(auto.name, max(len(lineas), 1))
        except Exception:
            pass

    except Exception as e:
        err_msg = str(e)
        print(f"[Scheduler] Error en auto {auto_id}: {err_msg}")
        # Marcar como error en la BD
        try:
            db2 = SessionLocal()
            auto2 = db2.query(Automatizacion).filter_by(id=auto_id).first()
            if auto2:
                auto2.status = "error"
                now2 = datetime.now()
                auto2.last_run = now2.strftime("%Y-%m-%d %H:%M")
                hist_err = HistorialEntry(
                    fecha    = now2.strftime("%Y-%m-%d"),
                    hora     = now2.strftime("%H:%M"),
                    concepto = auto2.name,
                    tipo     = "Automatización",
                    cuentas  = 0,
                    debito   = 0,
                    credito  = 0,
                    platform = auto2.platform,
                    status   = "error",
                    usuario  = "Sistema",
                    error_msg= err_msg,
                )
                db2.add(hist_err)
                db2.commit()

                # Email de alerta al contador
                try:
                    from services.email_service import notify_automation_error
                    notify_automation_error(auto2.name, err_msg, auto_id)
                except Exception:
                    pass
            db2.close()
        except Exception:
            pass
    finally:
        db.close()


def _freq_to_cron(freq: str, hora: str, dia_mes: int | None) -> dict:
    """Convierte frecuencia legible a kwargs de CronTrigger."""
    h, m = hora.split(":") if ":" in hora else ("6", "0")
    if freq == "Diario":
        return {"hour": h, "minute": m}
    if freq == "Semanal":
        return {"day_of_week": "mon", "hour": h, "minute": m}
    if freq == "Mensual":
        return {"day": dia_mes or 1, "hour": h, "minute": m}
    if freq == "Bimestral":
        return {"month": "1,3,5,7,9,11", "day": dia_mes or 1, "hour": h, "minute": m}
    return {"hour": h, "minute": m}


async def _send_daily_summary():
    """Envía resumen diario a las 22:00 hora Bogotá."""
    db = SessionLocal()
    try:
        from sqlalchemy import func
        today = datetime.now().strftime("%Y-%m-%d")
        total_ok     = db.query(func.count(HistorialEntry.id)).filter_by(fecha=today, status="ok").scalar()    or 0
        total_errors = db.query(func.count(HistorialEntry.id)).filter_by(fecha=today, status="error").scalar() or 0
        total_amount = db.query(func.sum(HistorialEntry.debito)).filter_by(fecha=today).scalar()               or 0
        from services.email_service import notify_daily_summary
        notify_daily_summary(total_ok, total_errors, total_amount)
        print(f"[Scheduler] Resumen diario enviado: {total_ok} ok, {total_errors} errores, ${total_amount:,.0f}")
    except Exception as e:
        print(f"[Scheduler] Error enviando resumen diario: {e}")
    finally:
        db.close()


def register_all_automations():
    """Carga todas las automatizaciones activas de la BD y las schedula."""
    scheduler.remove_all_jobs()
    db = SessionLocal()
    try:
        autos = db.query(Automatizacion).filter_by(active=True).all()
        for auto in autos:
            cron_kwargs = _freq_to_cron(auto.freq, auto.hora_ejecucion or "06:00", auto.dia_mes)
            scheduler.add_job(
                _run_automation,
                CronTrigger(**cron_kwargs),
                args=[auto.id],
                id=f"auto_{auto.id}",
                replace_existing=True,
                misfire_grace_time=3600,
            )
        print(f"[Scheduler] {len(autos)} automatizaciones programadas")

        # Resumen diario a las 22:00 hora Bogotá
        scheduler.add_job(
            _send_daily_summary,
            CronTrigger(hour=22, minute=0),
            id="daily_summary",
            replace_existing=True,
            misfire_grace_time=3600,
        )
        print("[Scheduler] Resumen diario programado para las 22:00")
    finally:
        db.close()


def reschedule_automation(auto_id: int, active: bool, freq: str, hora: str, dia_mes: int | None):
    """Llama desde el router al activar/desactivar o editar una automatización."""
    job_id = f"auto_{auto_id}"
    if not active:
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
        return
    cron_kwargs = _freq_to_cron(freq, hora, dia_mes)
    scheduler.add_job(
        _run_automation,
        CronTrigger(**cron_kwargs),
        args=[auto_id],
        id=job_id,
        replace_existing=True,
        misfire_grace_time=3600,
    )
