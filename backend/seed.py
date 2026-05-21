"""Run once to populate the database with demo data."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import json
from datetime import datetime
from database import engine, SessionLocal
from models import Base, Usuario, Causacion, Automatizacion, HistorialEntry, ApiConfig
from passlib.context import CryptContext

Base.metadata.create_all(bind=engine)
db = SessionLocal()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Demo user ─────────────────────────────────────────────────────────────────
if not db.query(Usuario).filter_by(email="admin@contaflow.co").first():
    db.add(Usuario(
        nombre="Carlos Andrés Vargas",
        email="admin@contaflow.co",
        password_hash=pwd_ctx.hash("demo1234"),
        tarjeta_profesional="TP-78432",
        active=True,
    ))
    print("OK - Usuario demo creado: admin@contaflow.co / demo1234")
else:
    print("OK - Usuario demo ya existe")

# ── API Configs ───────────────────────────────────────────────────────────────
for platform, email, nit in [
    ("siigo",  "carlos.vargas@empresa.com.co", "900.123.456-7"),
    ("alegra", "contabilidad@empresa.com.co",  "800.987.654-3"),
]:
    if not db.query(ApiConfig).filter_by(platform=platform).first():
        db.add(ApiConfig(
            platform=platform, user_email=email, api_key="demo-key-placeholder",
            nit=nit, env="prod", connected=True,
            last_tested=datetime.now().strftime("%Y-%m-%d %H:%M"),
        ))

# ── Automatizaciones ─────────────────────────────────────────────────────────
autos = [
    ("Nomina Mensual Automatica",  "Causa nomina cada fin de mes - 12 empleados",         "Mensual",   "both",   True,  "Hace 2 dias",   "2026-05-31", 48,  "ok",      "06:00", 30),
    ("Sync Siigo -> Alegra",       "Sincroniza facturas de venta entre plataformas",       "Diario",    "both",   True,  "Hace 3 horas",  "2026-05-21", 156, "ok",      "06:00", None),
    ("Retenciones Bimestre",       "Declara retenciones en la fuente cada 2 meses",        "Bimestral", "siigo",  True,  "Hace 15 dias",  "2026-06-01", 23,  "pending", "08:00", 1),
    ("Depreciacion Activos Fijos", "Causacion depreciacion mensual activos registrados",   "Mensual",   "alegra", False, "Hace 35 dias",  "Pausado",    12,  "off",     "07:00", 28),
    ("IVA Bimestral",              "Liquidacion automatica IVA generado y descontable",    "Bimestral", "both",   True,  "Hace 1 hora",   "2026-07-01", 34,  "pending", "09:00", 1),
    ("Backup Contable",            "Exporta asientos del periodo a Google Drive",          "Semanal",   "both",   False, "Hace 9 dias",   "Pausado",    8,   "off",     "22:00", None),
]
for name, desc, freq, plat, active, last, nxt, entries, status, hora, dia in autos:
    if not db.query(Automatizacion).filter_by(name=name).first():
        db.add(Automatizacion(
            name=name, desc=desc, freq=freq, platform=plat, active=active,
            last_run=last, next_run=nxt, entries_count=entries, status=status,
            hora_ejecucion=hora, dia_mes=dia,
            concepto_plantilla="",
            plantilla_lineas="[]",
        ))

# ── Causaciones de demo ───────────────────────────────────────────────────────
lineas_nomina = json.dumps([
    {"cuenta": "5105", "descripcion": "Sueldos y Salarios Mayo 2026",        "tercero": "900.123.456-7", "debito": 6500000, "credito": 0},
    {"cuenta": "5115", "descripcion": "Cesantias Mayo 2026",                 "tercero": "",             "debito": 541666,  "credito": 0},
    {"cuenta": "5120", "descripcion": "Intereses sobre Cesantias",           "tercero": "",             "debito": 65000,   "credito": 0},
    {"cuenta": "5125", "descripcion": "Vacaciones",                          "tercero": "",             "debito": 270833,  "credito": 0},
    {"cuenta": "5160", "descripcion": "Aporte Salud Empleador",              "tercero": "",             "debito": 552500,  "credito": 0},
    {"cuenta": "5165", "descripcion": "Aporte Pension Empleador",            "tercero": "",             "debito": 780000,  "credito": 0},
    {"cuenta": "5170", "descripcion": "Aporte ARL",                          "tercero": "",             "debito": 156000,  "credito": 0},
    {"cuenta": "2370", "descripcion": "Nomina por Pagar",                    "tercero": "",             "debito": 0,       "credito": 5727000},
    {"cuenta": "2360", "descripcion": "Retencion en la Fuente - Salarios",   "tercero": "",             "debito": 0,       "credito": 325000},
    {"cuenta": "2370", "descripcion": "Aportes Nomina por Pagar",            "tercero": "",             "debito": 0,       "credito": 1813999},
])
lineas_arriendo = json.dumps([
    {"cuenta": "5215", "descripcion": "Arriendo Oficina Mayo 2026",          "tercero": "800.111.222-3", "debito": 3200000, "credito": 0},
    {"cuenta": "2360", "descripcion": "Retencion Fuente - Arrendamiento 3.5%","tercero": "",             "debito": 0,       "credito": 112000},
    {"cuenta": "2205", "descripcion": "Arrendador por Pagar",                "tercero": "800.111.222-3", "debito": 0,       "credito": 3088000},
])
for fecha, concepto, plataforma, lineas, total, status, usuario in [
    ("2026-05-20", "Nomina Mayo 2026",         "both",   lineas_nomina,   8450000,  "ok",      "Sistema"),
    ("2026-05-19", "Arriendo Oficina Mayo",    "siigo",  lineas_arriendo, 3200000,  "ok",      "Carlos Vargas"),
    ("2026-05-17", "Depreciacion Abril 2026",  "siigo",  "[]",            560000,   "error",   "Sistema"),
]:
    if not db.query(Causacion).filter_by(concepto=concepto).first():
        db.add(Causacion(
            fecha=fecha, concepto=concepto, plataforma=plataforma,
            lineas=lineas, total_debito=total, total_credito=total,
            status=status, usuario=usuario,
            error_msg="Cuenta 5195 no existe en Siigo - verificar PUC" if status == "error" else None,
        ))

# ── Historial ─────────────────────────────────────────────────────────────────
historial = [
    ("2026-05-20", "09:14", "Nomina Mayo 2026",          "Causacion",      4, 8450000,  8450000,  "both",   "ok",      "Sistema"),
    ("2026-05-20", "06:02", "Sync Facturas Venta",        "Sincronizacion", 12, 34210000, 34210000, "both",   "ok",      "Auto"),
    ("2026-05-19", "17:30", "Arriendo Oficina Mayo",      "Causacion",      2, 3200000,  3200000,  "siigo",  "ok",      "C. Vargas"),
    ("2026-05-19", "11:45", "IVA Bimestre Mar-Abr",       "Liquidacion",    3, 12870000, 12870000, "alegra", "pending", "Sistema"),
    ("2026-05-18", "15:22", "Honorarios Contador",        "Causacion",      2, 1800000,  1800000,  "both",   "ok",      "C. Vargas"),
    ("2026-05-17", "09:00", "Depreciacion Abril",         "Causacion",      6, 560000,   560000,   "siigo",  "error",   "Sistema"),
    ("2026-05-16", "14:10", "Retencion Fuente Abr",       "Retencion",      3, 4320000,  4320000,  "siigo",  "ok",      "Auto"),
    ("2026-05-15", "08:55", "Nomina Extraordinaria",      "Causacion",      4, 1250000,  1250000,  "both",   "ok",      "C. Vargas"),
    ("2026-05-14", "10:30", "Causacion Primas Servicios", "Causacion",      4, 3900000,  3900000,  "both",   "ok",      "Sistema"),
    ("2026-05-13", "07:00", "Sync Alegra -> Siigo",       "Sincronizacion", 8, 18400000, 18400000, "both",   "ok",      "Auto"),
]
for fecha, hora, concepto, tipo, cuentas, deb, cred, plat, status, user in historial:
    db.add(HistorialEntry(
        fecha=fecha, hora=hora, concepto=concepto, tipo=tipo,
        cuentas=cuentas, debito=deb, credito=cred,
        platform=plat, status=status, usuario=user,
        error_msg="Cuenta PUC 5195 no configurada" if status == "error" else None,
    ))

db.commit()
db.close()
print("OK - Base de datos inicializada con datos de demostracion")
print("     Login: admin@contaflow.co / demo1234")
