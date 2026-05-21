"""
Alegra REST API client.

Docs:  https://developer.alegra.com/docs
Auth:  HTTP Basic — base64(email:token) en cada petición.
Token: permanente hasta que el usuario lo revoque en su cuenta.

DEMO_MODE=true  →  respuestas simuladas realistas (sin credenciales).
"""
import os
import base64
import random
import httpx
import asyncio
from datetime import datetime

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"


class AlegraClient:
    BASE_URL = "https://api.alegra.com/api/v1"

    def __init__(self, email: str, token: str, company_id: str, env: str = "prod"):
        self.email      = email
        self.token      = token
        self.company_id = company_id

    # ─── helpers ──────────────────────────────────────────────────────────────
    def _is_configured(self) -> bool:
        return bool(self.email and self.token and len(self.token) > 8)

    def _demo_mode(self) -> bool:
        return DEMO_MODE or not self._is_configured()

    def _headers(self) -> dict:
        if not self._is_configured():
            raise ValueError("Credenciales Alegra no configuradas")
        creds = base64.b64encode(f"{self.email}:{self.token}".encode()).decode()
        return {"Authorization": f"Basic {creds}", "Content-Type": "application/json"}

    # ─── test connection ──────────────────────────────────────────────────────
    async def test_connection(self) -> dict:
        if self._demo_mode():
            await asyncio.sleep(0.8)
            return {
                "ok": True,
                "message": f"[DEMO] Alegra simulado activo · NIT {self.company_id or '800.987.654-3'}",
                "demo": True,
            }
        try:
            async with httpx.AsyncClient(timeout=8) as c:
                r = await c.get(f"{self.BASE_URL}/company", headers=self._headers())
                r.raise_for_status()
                data = r.json()
            company = data.get("name", self.company_id)
            return {"ok": True, "message": f"Conectado · {company} · NIT {self.company_id}", "demo": False}
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return {"ok": False, "message": "Token inválido — ve a Alegra → Configuración → API"}
            return {"ok": False, "message": f"HTTP {e.response.status_code}: {e.response.text[:120]}"}
        except httpx.ConnectError:
            return {"ok": False, "message": "Sin conexión o host Alegra no disponible"}
        except Exception as e:
            return {"ok": False, "message": str(e)[:150]}

    # ─── create journal entry ─────────────────────────────────────────────────
    async def create_journal_entry(self, entry: dict) -> dict:
        if self._demo_mode():
            await asyncio.sleep(random.uniform(0.5, 1.3))
            if random.random() < 0.04:
                raise Exception("[DEMO] Límite de peticiones simulado")
            fake_id = f"AL-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000,9999)}"
            return {"id": fake_id, "status": "active"}

        lineas = entry.get("lineas", [])
        payload = {
            "date": entry["fecha"],
            "observations": entry["concepto"],
            "entries": [
                {
                    "account":      {"id": l["cuenta"]},     # Alegra usa ID interno
                    "description":  l.get("descripcion", ""),
                    "debit":        l.get("debito", 0),
                    "credit":       l.get("credito", 0),
                    **({"contact": {"id": l["tercero"]}} if l.get("tercero") else {}),
                }
                for l in lineas
            ],
        }

        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(f"{self.BASE_URL}/journal-entries", headers=self._headers(), json=payload)
            r.raise_for_status()
            data = r.json()

        return {"id": str(data.get("id", "")), "status": data.get("status", "active")}

    # ─── get invoices ─────────────────────────────────────────────────────────
    async def get_invoices(self, start: str | None = None) -> list[dict]:
        if self._demo_mode():
            await asyncio.sleep(0.5)
            return [
                {
                    "id": f"AL-INV-{i:04d}",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "total": random.randint(500_000, 50_000_000),
                    "client": f"{random.randint(800,999)}.{random.randint(100,999)}.{random.randint(100,999)}-{random.randint(0,9)}",
                    "source": "alegra-demo",
                }
                for i in range(1, random.randint(6, 15))
            ]

        params = {"order_field": "date", "order_direction": "DESC", "limit": 25}
        if start:
            params["date_gte"] = start

        async with httpx.AsyncClient(timeout=12) as c:
            r = await c.get(f"{self.BASE_URL}/invoices", headers=self._headers(), params=params)
            r.raise_for_status()
            body = r.json()
            return body if isinstance(body, list) else body.get("data", [])

    # ─── get contacts ─────────────────────────────────────────────────────────
    async def get_contacts(self, nit: str) -> list[dict]:
        if self._demo_mode():
            return [{"id": "1001", "name": "Tercero Demo", "identification_number": nit}]

        async with httpx.AsyncClient(timeout=8) as c:
            r = await c.get(
                f"{self.BASE_URL}/contacts",
                headers=self._headers(),
                params={"identification_number": nit},
            )
            r.raise_for_status()
            body = r.json()
            return body if isinstance(body, list) else []

    # ─── get accounts ─────────────────────────────────────────────────────────
    async def get_accounts(self) -> list[dict]:
        if self._demo_mode():
            return [
                {"id": c, "code": c, "name": n} for c, n in [
                    ("1105","Caja General"),("1110","Bancos"),("1305","Clientes"),
                    ("2205","Proveedores"),("2365","IVA"),("4135","Ingresos"),
                    ("5105","Gastos Personal"),("5110","Honorarios"),
                ]
            ]

        async with httpx.AsyncClient(timeout=12) as c:
            r = await c.get(f"{self.BASE_URL}/accounts", headers=self._headers())
            r.raise_for_status()
            body = r.json()
            return body if isinstance(body, list) else []
