@echo off
title Mass-Code GECM - Competitor Terminal
cd /d "%~dp0"

echo =======================================================
echo          MASS-CODE GECM - COMPETITOR MODE
echo =======================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required to run the application.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [INFO] Linking/installing local dependencies...
    if exist "..\node_modules\" (
        echo [INFO] Creating link to parent node_modules...
        mklink /J "node_modules" "..\node_modules" >nul 2>nul
    )
    if not exist "node_modules\" (
        call npm install
    )
)

echo [INFO] Launching Competitor Terminal...
if exist "node_modules\.bin\electron.cmd" (
    start "" "node_modules\.bin\electron.cmd" . --competitor-only
) else (
    where npx >nul 2>nul
    if %errorlevel% equ 0 (
        start "" npx electron . --competitor-only
    ) else (
        start "" electron . --competitor-only
    )
)
exit /b 0
