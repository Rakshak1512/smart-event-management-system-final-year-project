@echo off
title EventSphere - Stop All Servers and Tunnel
echo ===================================================
echo   Stopping EventSphere Backend, Frontend and Tunnel
echo ===================================================

echo Stopping cloudflared...
taskkill /F /IM cloudflared.exe >nul 2>&1

echo Stopping node/vite processes...
taskkill /F /IM node.exe >nul 2>&1

echo Stopping python/uvicorn backend processes...
taskkill /F /FI "WINDOWTITLE eq EventSphere Backend*" >nul 2>&1
taskkill /F /IM uvicorn.exe >nul 2>&1

echo.
echo All EventSphere servers and tunnels have been stopped.
pause
