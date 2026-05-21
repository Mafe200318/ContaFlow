# ContaFlow — Automatización Contable Colombia

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)

Herramienta de automatización contable para contadores colombianos. Conecta con **Siigo** y **Alegra** para automatizar causaciones, asientos contables y tareas repetitivas — con notificaciones por email, exportación a Excel y panel de control en tiempo real.

---

## ✨ Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Estadísticas en tiempo real, actividad reciente, estado de APIs |
| **Causaciones** | Crear/editar asientos contables con cuentas PUC, plantillas y exportación Excel |
| **Automatizaciones** | Tareas programadas (diario/semanal/mensual) con ejecución manual |
| **Historial** | Registro paginado con filtros por estado, plataforma y búsqueda |
| **Configuración** | Credenciales Siigo/Alegra con guías paso a paso y test de conexión |
| **Perfil** | Datos personales, tarjeta profesional y cambio de contraseña |
| **Auth** | Login, registro, recuperación de contraseña por email |

---

## 🚀 Inicio rápido

### Opción A — Un solo clic
Doble clic en `start.bat` (Windows)

### Opción B — Manual

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
cp .env.example .env          # completar con tus credenciales
python seed.py                # datos demo (solo la primera vez)
python -m uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

| Servicio | URL |
|----------|-----|
| App | http://localhost:5173 |
| API Docs (Swagger) | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

### Credenciales demo
```
Email:      admin@contaflow.co
Contraseña: demo1234
```

---

## 🗂️ Estructura del proyecto

```
ContaFlow/
├── backend/                    FastAPI + SQLAlchemy + APScheduler
│   ├── main.py                 Punto de entrada, CORS, lifespan
│   ├── auth.py                 JWT, bcrypt, OAuth2
│   ├── models.py               Modelos SQLAlchemy
│   ├── schemas.py              Schemas Pydantic
│   ├── database.py             SQLite / PostgreSQL
│   ├── scheduler.py            Automatizaciones programadas + email diario
│   ├── seed.py                 Datos de demostración
│   ├── .env.example            Plantilla de variables de entorno
│   ├── routers/
│   │   ├── auth_router.py      Login, registro, perfil, forgot/reset password
│   │   ├── causaciones.py      CRUD asientos → Siigo/Alegra
│   │   ├── automatizaciones.py CRUD + toggle + ejecución manual
│   │   ├── historial.py        Consulta paginada con filtros
│   │   ├── config_api.py       Credenciales + test + sync-prefs
│   │   └── export_router.py    Excel: historial y causaciones
│   ├── services/
│   │   ├── siigo.py            Cliente Siigo API v2 (OAuth2)
│   │   ├── alegra.py           Cliente Alegra REST API (Basic Auth)
│   │   └── email_service.py    SMTP: alertas de error y resumen diario
│   └── Dockerfile
│
├── frontend/                   React 18 + Vite
│   └── src/
│       ├── App.jsx
│       ├── api/client.js
│       └── components/
│           ├── Dashboard.jsx
│           ├── Causaciones.jsx
│           ├── Automatizaciones.jsx
│           ├── Historial.jsx
│           ├── Configuracion.jsx
│           ├── Login.jsx
│           ├── Perfil.jsx
│           ├── Sidebar.jsx
│           ├── ErrorBoundary.jsx
│           └── ui/
│
├── docker-compose.yml
└── start.bat
```

---

## 🔌 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /auth/login | Iniciar sesión |
| POST | /auth/register | Crear cuenta |
| POST | /auth/forgot-password | Recuperar contraseña |
| POST | /auth/reset-password | Restablecer contraseña |
| GET/POST | /causaciones/ | Listar / Crear asientos |
| PUT/DELETE | /causaciones/{id} | Editar / Eliminar |
| GET | /automatizaciones/ | Listar automatizaciones |
| PATCH | /automatizaciones/{id}/toggle | Activar/pausar |
| POST | /automatizaciones/{id}/run | Ejecutar ahora |
| GET | /historial/ | Historial paginado con filtros |
| GET | /historial/stats | Estadísticas dashboard |
| GET/PUT | /config/{platform} | Leer/guardar credenciales |
| POST | /config/{platform}/test | Probar conexión API |
| PUT | /config/sync-prefs | Preferencias de sincronización |
| GET | /export/historial | Exportar historial a Excel |
| GET | /export/causaciones | Exportar asientos a Excel |

---

## ⚙️ Variables de entorno

Copia `backend/.env.example` → `backend/.env` y completa:

```env
APP_SECRET=tu-clave-secreta-aqui
FRONTEND_URL=http://localhost:5173

# Base de datos (SQLite por defecto, PostgreSQL en producción)
# DATABASE_URL=postgresql://user:pass@localhost:5432/contaflow

DEMO_MODE=true   # false para usar APIs reales

# Siigo (developer.siigo.com)
SIIGO_EMAIL=
SIIGO_API_KEY=
SIIGO_NIT=

# Alegra (app.alegra.com → Configuración → Integraciones → API)
ALEGRA_EMAIL=
ALEGRA_TOKEN=
ALEGRA_NIT=

# Notificaciones email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
NOTIFY_EMAIL=
```

---

## 🐳 Docker

```bash
docker-compose up --build
```

- Frontend → http://localhost:80
- Backend → http://localhost:8000

---

## 📄 Licencia

MIT
