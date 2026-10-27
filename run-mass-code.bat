@echo off
setlocal enabledelayedexpansion
title Mass-Code Launcher
cd /d "%~dp0"

echo ============================================================================
echo   MASS-CODE // UNIVERSAL OFFLINE COMPETITIVE PROGRAMMING PLATFORM
echo   Zero-Installation Click-to-Run Launcher
echo ============================================================================
echo.

:: 1. Check if node_modules directory exists
if not exist "node_modules\" (
    echo [SETUP] First-time setup detected: node_modules missing.
    echo [SETUP] Installing dependencies silently in the background...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies. Please ensure Node.js is installed.
        pause
        exit /b 1
    )
    echo [SETUP] Dependencies installed successfully.
    echo.
)

:: 2. Launch the Electron application instantly
echo [BOOT] Launching Mass-Code Platform...
where npx >nul 2>nul
if %errorlevel% equ 0 (
    start "" npx electron .
) else (
    where npm >nul 2>nul
    if %errorlevel% equ 0 (
        start "" npm start
    ) else (
        echo [ERROR] Neither npx nor npm found in system PATH.
        echo Please ensure Node.js is installed on this machine.
        pause
        exit /b 1
    )
)

exit /b 0
