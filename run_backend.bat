@echo off
title EventSphere Backend
cd /d "%~dp0smart-event-management-system\backend"
echo Starting EventSphere Backend Server...
.\venv\Scripts\python.exe run_server.py
pause
