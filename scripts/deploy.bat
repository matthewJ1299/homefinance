@echo off
REM Launcher for deploy.ps1. Pass optional commit message in quotes.
REM Example: deploy.bat "Deploy: update dashboard"
setlocal
set SCRIPT_DIR=%~dp0
set ROOT=%SCRIPT_DIR%..
cd /d "%ROOT%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%deploy.ps1" %*
