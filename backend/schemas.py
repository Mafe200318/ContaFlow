from pydantic import BaseModel
from typing import Any


class LineaAsiento(BaseModel):
    cuenta: str
    descripcion: str
    tercero: str = ""
    debito: float = 0
    credito: float = 0


class CausacionCreate(BaseModel):
    fecha: str
    concepto: str
    plataforma: str
    lineas: list[LineaAsiento]
    usuario: str = "Sistema"


class CausacionOut(BaseModel):
    id: int
    fecha: str
    concepto: str
    plataforma: str
    lineas: list[dict]
    total_debito: float
    total_credito: float
    status: str
    usuario: str
    created_at: str
    siigo_id: str | None
    alegra_id: str | None
    error_msg: str | None

    class Config:
        from_attributes = True


class AutoCreate(BaseModel):
    name: str
    desc: str
    freq: str
    platform: str
    plantilla_lineas: list[dict] = []


class AutoOut(BaseModel):
    id: int
    name: str
    desc: str
    freq: str
    platform: str
    active: bool
    last_run: str | None
    next_run: str | None
    entries_count: int
    status: str

    class Config:
        from_attributes = True


class AutoToggle(BaseModel):
    active: bool


class HistorialOut(BaseModel):
    id: int
    fecha: str
    hora: str
    concepto: str
    tipo: str
    cuentas: int
    debito: float
    credito: float
    platform: str
    status: str
    usuario: str

    class Config:
        from_attributes = True


class ApiConfigIn(BaseModel):
    user_email: str
    api_key: str
    nit: str
    env: str = "prod"
    sync_freq: str = "daily"
    sync_hour: str = "06:00"


class ApiConfigOut(BaseModel):
    platform: str
    user_email: str
    nit: str
    env: str
    connected: bool
    last_tested: str | None
    sync_freq: str
    sync_hour: str

    class Config:
        from_attributes = True


class SyncResult(BaseModel):
    platform: str
    success: bool
    synced: int
    message: str
