@echo off
title Mass-Code Launcher
cd /d "%~dp0"
echo [INFO] Booting Mass-Code Platform...
start "" npx electron .
exit /b 0
