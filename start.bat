@echo off
echo ==========================================
echo   ContaFlow — Iniciando Backend + Frontend
echo ==========================================

echo.
echo [1/4] Liberando puertos ocupados (8000)...
powershell -NoProfile -Command ^
  "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ^
   ForEach-Object { Write-Host '  Liberando PID' $_.OwningProcess; ^
   Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
timeout /t 2 /nobreak > nul

echo [2/4] Instalando dependencias Python...
cd /d "%~dp0backend"
pip install -r requirements.txt --quiet

echo [3/4] Inicializando base de datos con datos demo...
python seed.py

echo [4/4] Iniciando servidores...
echo.
echo  Backend  ^-^> http://localhost:8000
echo  Frontend ^-^> http://localhost:5173
echo  API Docs ^-^> http://localhost:8000/docs
echo.

start "ContaFlow Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak > nul

start "ContaFlow Frontend" cmd /k "cd /d %~dp0frontend && npm install --silent && npm run dev"

echo Abriendo aplicacion en 5 segundos...
timeout /t 5 /nobreak > nul
start http://localhost:5173
