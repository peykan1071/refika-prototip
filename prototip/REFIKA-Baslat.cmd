@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo REFIKA icin Node.js 22.13 veya uzeri gerekli.
  pause
  exit /b 1
)
set "PORT=4317"
node "scripts\start-local.mjs"
if errorlevel 1 (
  pause
  exit /b 1
)
start "" "http://127.0.0.1:4317/"
