@echo off
title EventSphere Frontend
cd /d "%~dp0smart-event-management-system\frontend"
echo Starting EventSphere Frontend Server on http://localhost:5173 ...
npm run dev
pause
