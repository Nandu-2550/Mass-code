@echo off
title Mass-Code (GECM) - Standalone Packager
cd /d "%~dp0"

echo =========================================================================
echo       MASS-CODE (GECM) - STANDALONE INSTALLER AND PORTABLE BUILDER
echo =========================================================================
echo.
echo Packaging module: Mass-Code
echo Destination folder: %~dp0dist
echo.

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR]: Node.js and npm are required on this build machine to create the installer.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/3] Updating win-unpacked app code directly...
call node scripts\repack_unpacked.js

echo.
echo [2/3] Verifying electron-builder in Mass-Code...
call npm install --save-dev electron-builder

echo.
echo [3/3] Compiling standalone Windows installer / portable binaries...
echo (NOTE: If 7-Zip symlink error occurs, run this .bat as Administrator)
call npx electron-builder --win

echo.
echo =========================================================================
echo   PACKAGE GENERATION FINISHED!
echo =========================================================================
echo Check your dist folder:
echo    %~dp0dist\
echo.
echo Option A (Folder distribution - Already Working!):
echo   - The folder 'dist\win-unpacked' contains 'Mass-Code (GECM).exe'.
echo     You can copy that folder to any lab PC and run it immediately!
echo.
echo Option B (Single installer .exe):
echo   - To produce the single-file setup .exe without symlink errors,
echo     Right-click this .bat and select "Run as administrator".
echo =========================================================================
echo.
pause

