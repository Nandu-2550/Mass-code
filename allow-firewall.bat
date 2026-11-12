@echo off
title Mass-Code - Allow Windows Defender Firewall
cd /d "%~dp0"

echo =========================================================================
echo       MASS-CODE: CONFIGURE WINDOWS DEFENDER FIREWALL FOR HOSTING
echo =========================================================================
echo.
echo This script opens Port 8080 (TCP) and Port 45454 (UDP) so other computers
echo on your local Wi-Fi / LAN network can connect and pull contest questions.
echo.

net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] Administrator privilege required to modify Windows Firewall.
    echo Requesting elevation...
    powershell -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\"MassCode Host Server (8080)\" dir=in action=allow protocol=TCP localport=8080 && netsh advfirewall firewall add rule name=\"MassCode UDP Discovery (45454)\" dir=in action=allow protocol=UDP localport=45454 && echo [SUCCESS] Firewall rules added! && pause' -Verb RunAs"
    exit /b
)

netsh advfirewall firewall add rule name="MassCode Host Server (8080)" dir=in action=allow protocol=TCP localport=8080
netsh advfirewall firewall add rule name="MassCode UDP Discovery (45454)" dir=in action=allow protocol=UDP localport=45454

echo.
echo =========================================================================
echo   FIREWALL RULES ADDED SUCCESSFULLY!
echo =========================================================================
echo Port 8080 (TCP) - Allowed for inbound contest distribution
echo Port 45454 (UDP) - Allowed for LAN auto-discovery broadcast
echo.
pause
