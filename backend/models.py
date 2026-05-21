from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[int]          = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str]      = mapped_column(String(200))
    email: Mapped[str]       = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(500))
    tarjeta_profesional: Mapped[str] = mapped_column(String(50), default="")
    active: Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Causacion(Base):
    __tablename__ = "causaciones"
    id: Mapped[int]          = mapped_column(Integer, primary_key=True, index=True)
    fecha: Mapped[str]       = mapped_column(String(10))
    concepto: Mapped[str]    = mapped_column(String(255))
    plataforma: Mapped[str]  = mapped_column(String(20))
    lineas: Mapped[str]      = mapped_column(Text)
    total_debito: Mapped[float]  = mapped_column(Float, default=0)
    total_credito: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str]      = mapped_column(String(20), default="pending")
    usuario: Mapped[str]     = mapped_column(String(100), default="Sistema")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    siigo_id: Mapped[str | None]  = mapped_column(String(100), nullable=True)
    alegra_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_msg: Mapped[str | None] = mapped_column(Text, nullable=True)


class Automatizacion(Base):
    __tablename__ = "automatizaciones"
    id: Mapped[int]          = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str]        = mapped_column(String(200))
    desc: Mapped[str]        = mapped_column(String(500))
    freq: Mapped[str]        = mapped_column(String(50))
    platform: Mapped[str]    = mapped_column(String(20))
    active: Mapped[bool]     = mapped_column(Boolean, default=True)
    plantilla_lineas: Mapped[str] = mapped_column(Text, default="[]")
    last_run: Mapped[str | None]  = mapped_column(String(100), nullable=True)
    next_run: Mapped[str | None]  = mapped_column(String(100), nullable=True)
    entries_count: Mapped[int]    = mapped_column(Integer, default=0)
    status: Mapped[str]      = mapped_column(String(20), default="ok")
    hora_ejecucion: Mapped[str]   = mapped_column(String(5), default="06:00")
    dia_mes: Mapped[int | None]   = mapped_column(Integer, nullable=True)   # para freq=Mensual
    concepto_plantilla: Mapped[str] = mapped_column(String(255), default="")


class HistorialEntry(Base):
    __tablename__ = "historial"
    id: Mapped[int]          = mapped_column(Integer, primary_key=True, index=True)
    fecha: Mapped[str]       = mapped_column(String(10))
    hora: Mapped[str]        = mapped_column(String(5))
    concepto: Mapped[str]    = mapped_column(String(255))
    tipo: Mapped[str]        = mapped_column(String(50))
    cuentas: Mapped[int]     = mapped_column(Integer, default=0)
    debito: Mapped[float]    = mapped_column(Float, default=0)
    credito: Mapped[float]   = mapped_column(Float, default=0)
    platform: Mapped[str]    = mapped_column(String(20))
    status: Mapped[str]      = mapped_column(String(20), default="ok")
    usuario: Mapped[str]     = mapped_column(String(100), default="Sistema")
    error_msg: Mapped[str | None] = mapped_column(Text, nullable=True)


class ApiConfig(Base):
    __tablename__ = "api_config"
    id: Mapped[int]          = mapped_column(Integer, primary_key=True, index=True)
    platform: Mapped[str]    = mapped_column(String(20), unique=True)
    user_email: Mapped[str]  = mapped_column(String(255), default="")
    api_key: Mapped[str]     = mapped_column(String(500), default="")
    nit: Mapped[str]         = mapped_column(String(50), default="")
    env: Mapped[str]         = mapped_column(String(20), default="prod")
    connected: Mapped[bool]  = mapped_column(Boolean, default=False)
    last_tested: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sync_freq: Mapped[str]   = mapped_column(String(20), default="daily")
    sync_hour: Mapped[str]   = mapped_column(String(5), default="06:00")
