import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base
from routers import causaciones, automatizaciones, historial, config_api
from routers import auth_router, export_router
from scheduler import scheduler, register_all_automations

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicio: arrancar scheduler
    register_all_automations()
    scheduler.start()
    print("[ContaFlow] Scheduler iniciado")
    yield
    # Cierre: detener scheduler
    scheduler.shutdown(wait=False)
    print("[ContaFlow] Scheduler detenido")


app = FastAPI(
    title="ContaFlow API",
    description="Automatización contable Siigo + Alegra — Colombia",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(causaciones.router)
app.include_router(automatizaciones.router)
app.include_router(historial.router)
app.include_router(config_api.router)
app.include_router(export_router.router)


@app.get("/")
def root():
    return {"app": "ContaFlow API", "version": "2.0.0", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/status")
def status():
    demo   = os.getenv("DEMO_MODE", "true").lower() == "true"
    return {
        "demo_mode": demo,
        "siigo":  {"configured": bool(os.getenv("SIIGO_API_KEY")),  "mode": "real" if (os.getenv("SIIGO_API_KEY")  and not demo) else "demo", "env": os.getenv("SIIGO_ENV",  "sandbox")},
        "alegra": {"configured": bool(os.getenv("ALEGRA_TOKEN")),   "mode": "real" if (os.getenv("ALEGRA_TOKEN")   and not demo) else "demo", "env": os.getenv("ALEGRA_ENV", "prod")},
    }
