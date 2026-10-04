@echo off
title EventSphere - Start All Servers
echo Starting EventSphere Backend and Frontend...

start "EventSphere Backend" cmd /k "cd /d "%~dp0smart-event-management-system\backend" && .\venv\Scripts\python.exe run_server.py"

timeout /t 2 /nobreak >nul

start "EventSphere Frontend" cmd /k "cd /d "%~dp0smart-event-management-system\frontend" && npm run dev"

echo.
echo ===================================================
echo EventSphere is running!
echo Backend:  http://127.0.0.1:8000 (or fallback 8001)
echo Frontend: http://localhost:5173
echo ===================================================
echo.
pause
