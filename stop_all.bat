@echo off
title EventSphere - Stop All Local Servers
echo ===================================================
echo   Stopping EventSphere Backend and Frontend
echo ===================================================

echo Stopping node/vite processes...
taskkill /F /IM node.exe >nul 2>&1

echo Stopping python/uvicorn backend processes...
taskkill /F /FI "WINDOWTITLE eq EventSphere Backend*" >nul 2>&1
taskkill /F /IM uvicorn.exe >nul 2>&1

echo.
echo All EventSphere servers have been stopped.
pause

