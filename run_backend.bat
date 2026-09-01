@echo off
title EventSphere Backend
cd /d "%~dp0smart-event-management-system\backend"
echo Starting EventSphere Backend Server on http://127.0.0.1:8000 ...
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
