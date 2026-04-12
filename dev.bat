@echo off
title OneToMany Dev

echo Starting services...
echo.

start "Backend (API + WhatsApp + Email)" cmd /k "cd /d "%~dp0backend-node" && npm run dev"
timeout /t 2 >nul

start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Services launched in separate windows:
echo   Backend  ^>  http://localhost:8000
echo   Frontend ^>  http://localhost:3000
echo.
pause
