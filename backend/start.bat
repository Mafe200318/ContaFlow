@echo off
setlocal

echo [ContaFlow] Cleaning up zombie processes on ports 8000, 8001, 8002...

powershell -NoProfile -Command ^
  "8000,8001,8002 | ForEach-Object { $port = $_; " ^
  "Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | " ^
  "ForEach-Object { Write-Host \"  Killing PID $($_.OwningProcess) on port $port\"; " ^
  "Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"

echo [ContaFlow] Waiting 2 seconds for sockets to release...
timeout /t 2 /nobreak > nul

echo [ContaFlow] Starting uvicorn on http://127.0.0.1:8000 ...
cd /d "%~dp0"
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

endlocal
