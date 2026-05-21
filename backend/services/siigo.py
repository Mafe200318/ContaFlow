"""
Siigo API v2 client.

Docs:  https://developer.siigo.com/docs
Auth:  OAuth2 — POST /auth/token  (username + access_key)
Token: dura 24 h; se cachea en memoria para no re-autenticar.

DEMO_MODE=true  →  respuestas simuladas realistas (sin credenciales).
"""
import os
import random
import httpx
import asyncio
from datetime import datetime, timedelta

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

SANDBOX_URL = "https://api.siigo.com"   # Siigo usa el mismo host; sandbox se activa con creds de sandbox
PROD_URL    = "https://api.siigo.com"


class SiigoClient:
    _token_cache: dict = {}   # {(email, key): (token, expires_at)}

    def __init__(self, email: str, api_key: str, nit: str, env: str = "prod"):
        self.email   = email
        self.api_key = api_key
        self.nit     = nit
        self.base    = SANDBOX_URL if env == "sandbox" else PROD_URL

    # ─── helpers ──────────────────────────────────────────────────────────────
    def _is_configured(self) -> bool:
        return bool(self.email and self.api_key and len(self.api_key) > 8)

    def _demo_mode(self) -> bool:
        return DEMO_MODE or not self._is_configured()

    async def _get_token(self) -> str:
        cache_key = (self.email, self.api_key)
        cached = self._token_cache.get(cache_key)
        if cached:
            token, exp = cached
            if datetime.utcnow() < exp:
                return token

        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                f"{self.base}/auth/token",
                json={"username": self.email, "access_key": self.api_key},
            )
            r.raise_for_status()
            data = r.json()

        token = data["access_token"]
        expires_in = data.get("expires_in", 86400)
        self._token_cache[cache_key] = (token, datetime.utcnow() + timedelta(seconds=expires_in - 60))
        return token

    def _auth_headers(self, token: str) -> dict:
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Partner-Id": "ContaFlow",
        }

    # ─── test connection ──────────────────────────────────────────────────────
    async def test_connection(self) -> dict:
        if self._demo_mode():
            await asyncio.sleep(0.9)
            return {
                "ok": True,
                "message": f"[DEMO] Siigo simulado activo · NIT {self.nit or '900.123.456-7'}",
                "demo": True,
            }
        try:
            token = await self._get_token()
            async with httpx.AsyncClient(timeout=8) as c:
                r = await c.get(f"{self.base}/v1/users", headers=self._auth_headers(token))
                r.raise_for_status()
            return {"ok": True, "message": f"Conectado · Siigo API v2 · NIT {self.nit}", "demo": False}
        except httpx.HTTPStatusError as e:
            return {"ok": False, "message": f"HTTP {e.response.status_code}: credenciales inválidas o sin permisos"}
        except httpx.ConnectError:
            return {"ok": False, "message": "Sin conexión a internet o host Siigo no disponible"}
        except Exception as e:
            return {"ok": False, "message": str(e)[:150]}

    # ─── create journal entry ─────────────────────────────────────────────────
    async def create_journal_entry(self, entry: dict) -> dict:
        if self._demo_mode():
            await asyncio.sleep(random.uniform(0.4, 1.1))
            if random.random() < 0.04:
                raise Exception("[DEMO] Timeout simulado — reintente")
            fake_id = f"SG-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000,9999)}"
            return {"id": fake_id, "status": "Processed"}

        token = await self._get_token()
        lineas = entry.get("lineas", [])

        payload = {
            "date": entry["fecha"],
            "narration": entry["concepto"],
            "items": [
                {
                    "account": {"code": l["cuenta"]},
                    "description": l.get("descripcion", ""),
                    **({"customer": {"identification": l["tercero"]}} if l.get("tercero") else {}),
                    **({"debit": l["debito"]} if l.get("debito", 0) > 0 else {}),
                    **({"credit": l["credito"]} if l.get("credito", 0) > 0 else {}),
                }
                for l in lineas
            ],
        }

        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(f"{self.base}/v1/journals", headers=self._auth_headers(token), json=payload)
            r.raise_for_status()
            data = r.json()

        return {"id": str(data.get("id", "")), "status": data.get("status", "Processed")}

    # ─── get invoices ─────────────────────────────────────────────────────────
    async def get_invoices(self, page: int = 1) -> list[dict]:
        if self._demo_mode():
            await asyncio.sleep(0.6)
            return [
                {
                    "id": f"SG-INV-{i:04d}",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "total": random.randint(500_000, 50_000_000),
                    "customer_nit": f"{random.randint(800,999)}.{random.randint(100,999)}.{random.randint(100,999)}-{random.randint(0,9)}",
                    "source": "siigo-demo",
                }
                for i in range(1, random.randint(8, 18))
            ]

        token = await self._get_token()
        async with httpx.AsyncClient(timeout=12) as c:
            r = await c.get(
                f"{self.base}/v1/invoices",
                headers=self._auth_headers(token),
                params={"page": page, "page_size": 25},
            )
            r.raise_for_status()
            return r.json().get("results", [])

    # ─── get accounts (PUC) ───────────────────────────────────────────────────
    async def get_accounts(self) -> list[dict]:
        if self._demo_mode():
            await asyncio.sleep(0.5)
            return [
                {"code": c, "name": n} for c, n in [
                    ("1105","Caja General"),("1110","Bancos"),("1305","Clientes"),
                    ("2205","Proveedores"),("2360","Retención Fuente"),("2365","IVA"),
                    ("4135","Ingresos Ventas"),("5105","Gastos Personal"),("5110","Honorarios"),
                ]
            ]

        token = await self._get_token()
        async with httpx.AsyncClient(timeout=12) as c:
            r = await c.get(f"{self.base}/v1/accounts", headers=self._auth_headers(token))
            r.raise_for_status()
            return r.json().get("results", [])
