@echo off
title EventSphere - Public Share (Cloudflare Tunnel)
echo ===================================================
echo   Starting EventSphere Local Servers and Tunnel
echo ===================================================
echo.

:: 1. Start Backend
start "EventSphere Backend" cmd /k "cd /d "%~dp0smart-event-management-system\backend" && .\venv\Scripts\python.exe run_server.py"

:: 2. Wait 2 seconds
timeout /t 2 /nobreak >nul

:: 3. Start Frontend
start "EventSphere Frontend" cmd /k "cd /d "%~dp0smart-event-management-system\frontend" && npm run dev"

:: 4. Wait 3 seconds
timeout /t 3 /nobreak >nul

:: 5. Start Cloudflare Tunnel
echo.
echo Starting Cloudflare Tunnel...
echo The generated public HTTPS URL will appear in the tunnel window.
echo Share that link with any device or network!
echo.
start "EventSphere Cloudflare Tunnel" cmd /k ""C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5173"

echo Setup initialized!
pause
