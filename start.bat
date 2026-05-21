@echo off
echo ==========================================
echo   ContaFlow — Iniciando Backend + Frontend
echo ==========================================

echo.
echo [1/3] Instalando dependencias Python...
cd /d "%~dp0backend"
pip install -r requirements.txt --quiet

echo [2/3] Inicializando base de datos con datos demo...
python seed.py

echo [3/3] Iniciando servidores...
echo.
echo  Backend  → http://localhost:8000
echo  Frontend → http://localhost:5173
echo  API Docs → http://localhost:8000/docs
echo.

start "ContaFlow Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --port 8000"

timeout /t 2 /nobreak > nul

start "ContaFlow Frontend" cmd /k "cd /d %~dp0frontend && npm install --silent && npm run dev"

echo Abriendo aplicación en 5 segundos...
timeout /t 5 /nobreak > nul
start http://localhost:5173
