@echo off
echo Iniciando Cruzada Ibirite 2026...

start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
start "Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo.
echo Frontend: http://localhost:5182
echo Backend:  http://localhost:3182
echo.
pause
