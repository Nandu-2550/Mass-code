@echo off
setlocal EnableDelayedExpansion

:: ============================================================================
:: BUG BUSTERS // AUTOMATED LAB ENVIRONMENT DEPLOYMENT SCRIPT (WINDOWS)
:: Universal Offline Competitive Programming Setup
:: Designed to execute from central USB drive to configure student lab machines.
:: ============================================================================

title "Bug Busters - Lab Environment Setup & Verification"
color 0F

echo ===============================================================================
echo   ____  _   _  ____   ____  _   _ ____ _____ _____ ____  ____  
echo  ^| __ )^| ^| ^| ^|^|  _ \ ^| __ )^| ^| ^| / ___^|_   _^| ____^|  _ \/ ___^| 
echo  ^|  _ \^| ^| ^| ^|^| ^|_^| ^|^|  _ \^| ^| ^| \___ \ ^| ^| ^|  _^| ^| ^|_) \___ \ 
echo  ^| ^|_) ^| ^|_^| ^|^|  _ ^< ^| ^|_) ^| ^|_^| ^|___) ^|^| ^| ^| ^|___^|  _ ^< ___) ^|
echo  ^|____/ \___/ ^|_^| \_\^|____/ \___/^|____/ ^|_^| ^|_____^|_^| \_\____/ 
echo.
echo   AUTOMATED LAB ENVIRONMENT VERIFICATION ^& DEPLOYMENT UTILITY
echo ===============================================================================
echo.

set "USB_SOURCE=%~dp0"
set "TARGET_DIR=%USERPROFILE%\Desktop\BugBusters_Local"
set "REPORT_FILE=%TARGET_DIR%\env_report.txt"
set "APP_READY=READY"
set "GCC_STATUS=NOT_FOUND"
set "GCC_VERSION=MISSING"
set "NODE_STATUS=OPTIONAL_MISSING"

:: ----------------------------------------------------------------------------
:: 1. VERIFY GCC COMPILER AVAILABILITY
:: ----------------------------------------------------------------------------
echo [INFO] Step 1/4: Diagnosing native C/C++ GCC Compiler environment...

where gcc >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%g in ('gcc --version 2^>nul') do (
        set "GCC_VERSION=%%g"
        goto :gcc_found_globally
    )
)

:gcc_not_global
echo [WARNING] 'gcc' is not currently registered in the global system PATH.
echo [INFO] Scanning known local MinGW installation directories on this PC...

set "CANDIDATE_PATHS="
set "CANDIDATE_PATHS=%CANDIDATE_PATHS%;C:\MinGW\bin"
set "CANDIDATE_PATHS=%CANDIDATE_PATHS%;C:\Program Files\CodeBlocks\MinGW\bin"
set "CANDIDATE_PATHS=%CANDIDATE_PATHS%;C:\Program Files (x86)\CodeBlocks\MinGW\bin"
set "CANDIDATE_PATHS=%CANDIDATE_PATHS%;C:\msys64\mingw64\bin"
set "CANDIDATE_PATHS=%CANDIDATE_PATHS%;C:\TDM-GCC-64\bin"
set "CANDIDATE_PATHS=%CANDIDATE_PATHS%;%USB_SOURCE%MinGW\bin"
set "CANDIDATE_PATHS=%CANDIDATE_PATHS%;%USB_SOURCE%dependencies\MinGW\bin"

set "FOUND_GCC_DIR="
for %%P in (%CANDIDATE_PATHS%) do (
    if exist "%%~P\gcc.exe" (
        set "FOUND_GCC_DIR=%%~P"
        goto :apply_gcc_path
    )
)

if "%FOUND_GCC_DIR%"=="" (
    echo.
    echo ===============================================================================
    echo [ERROR] FATAL: GCC COMPILER NOT FOUND ON THIS SYSTEM!
    echo ===============================================================================
    echo The offline competitive programming runtime requires a native C compiler.
    echo.
    echo INSTRUCTIONS FOR LAB COORDINATOR:
    echo  1. Locate the MinGW / CodeBlocks compiler installer on the USB drive.
    echo  2. Install MinGW to C:\MinGW (Default) or C:\Program Files\CodeBlocks\MinGW.
    echo  3. Re-run this setup script: "%~nx0".
    echo ===============================================================================
    set "APP_READY=FAILED"
    set "GCC_STATUS=CRITICAL_MISSING"
    set "GCC_VERSION=NOT_INSTALLED"
    goto :check_nodejs
)

:apply_gcc_path
echo [SUCCESS] Discovered local GCC compiler binary at: "%FOUND_GCC_DIR%"
echo [INFO] Registering "%FOUND_GCC_DIR%" into persistent user PATH environment...

:: Programmatically append to persistent user PATH via setx
setx PATH "%PATH%;%FOUND_GCC_DIR%" >nul 2>nul
set "PATH=%PATH%;%FOUND_GCC_DIR%"

for /f "tokens=*" %%g in ('"%FOUND_GCC_DIR%\gcc.exe" --version 2^>nul') do (
    set "GCC_VERSION=%%g"
    goto :gcc_resolved
)

:gcc_found_globally
echo [SUCCESS] Native GCC compiler detected in global PATH:
echo           "%GCC_VERSION%"
set "GCC_STATUS=GLOBAL_ACTIVE"
goto :check_nodejs

:gcc_resolved
echo [SUCCESS] GCC path successfully patched and active for this user profile:
echo           "%GCC_VERSION%"
set "GCC_STATUS=LOCAL_PATCHED"

:: ----------------------------------------------------------------------------
:: 2. VERIFY NODE.JS RUNTIME (OPTIONAL FOR DEBUGGING)
:: ----------------------------------------------------------------------------
:check_nodejs
echo.
echo [INFO] Step 2/4: Checking Node.js debugging runtime status...
where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%n in ('node -v 2^>nul') do (
        set "NODE_STATUS=%%n"
        echo [SUCCESS] Node.js runtime detected: %%n
    )
) else (
    echo [INFO] Node.js not detected in global PATH.
    echo        [Optional if running pre-packaged standalone Bug Busters executable]
    set "NODE_STATUS=NOT_INSTALLED_OPTIONAL"
)

:: ----------------------------------------------------------------------------
:: 3. WORKSPACE AUTOMATION & ASSET LOCALIZATION
:: ----------------------------------------------------------------------------
echo.
echo [INFO] Step 3/4: Provisioning local workspace at:
echo        "%TARGET_DIR%"

if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%" >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create destination directory on student desktop.
        set "APP_READY=FAILED"
        goto :write_report
    )
)

echo [INFO] Transferring application package assets from USB storage...
:: Exclude version control, temporary compiler cache, and heavy dev directories
where robocopy >nul 2>nul
if %errorlevel% equ 0 (
    robocopy "%USB_SOURCE%\" "%TARGET_DIR%\" /E /NFL /NDL /NJH /NJS /XD node_modules temp .git .agents .agent sessions submissions /XF setup_env.bat setup_env.sh *.log >nul
) else (
    xcopy "%USB_SOURCE%*" "%TARGET_DIR%\" /E /I /Y /Q >nul 2>nul
)

echo [SUCCESS] Application payload localized to student desktop.

:: ----------------------------------------------------------------------------
:: 4. DESKTOP SHORTCUT CREATION
:: ----------------------------------------------------------------------------
echo.
echo [INFO] Step 4/4: Generating student desktop launcher shortcut...

set "RUNNER_BAT=%TARGET_DIR%\run_bugbusters.bat"
(
    echo @echo off
    echo cd /d "%TARGET_DIR%"
    echo start "" npm start
) > "%RUNNER_BAT%"

set "SHORTCUT_PATH=%USERPROFILE%\Desktop\Bug Busters Platform.lnk"

:: Use PowerShell COM automation to safely generate .lnk desktop shortcut
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$s = $ws.CreateShortcut('%SHORTCUT_PATH%'); " ^
    "$s.TargetPath = '%RUNNER_BAT%'; " ^
    "$s.WorkingDirectory = '%TARGET_DIR%'; " ^
    "$s.Description = 'Bug Busters Offline Competitive Programming & Exam Platform'; " ^
    "$s.Save()" >nul 2>nul

if exist "%SHORTCUT_PATH%" (
    echo [SUCCESS] Desktop launcher shortcut created:
    echo           "%SHORTCUT_PATH%"
) else (
    echo [WARNING] Could not automatically create desktop shortcut.
    echo           Student can run: "%RUNNER_BAT%" directly.
)

:: ----------------------------------------------------------------------------
:: 5. CROSS-PLATFORM SYSTEM REPORTING (env_report.txt)
:: ----------------------------------------------------------------------------
:write_report
(
    echo ===============================================================================
    echo BUG BUSTERS LAB ENVIRONMENT HEALTH REPORT [WINDOWS]
    echo Timestamp              : !DATE! !TIME!
    echo ===============================================================================
    echo Student PC Name        : !COMPUTERNAME!
    echo OS Architecture Type   : !PROCESSOR_ARCHITECTURE!
    echo Operating System       : !OS!
    echo Logged-in User Account : !USERNAME!
    echo User Desktop Path      : !USERPROFILE!\Desktop
    echo Local Deployment Target: !TARGET_DIR!
    echo Source USB Device Path : !USB_SOURCE!
    echo.
    echo --- COMPILER ^& RUNTIME DIAGNOSTICS ---
    echo GCC Integration Status : !GCC_STATUS!
    echo Global GCC Version     : !GCC_VERSION!
    echo Node.js Engine Status  : !NODE_STATUS!
    echo.
    echo --- OVERALL DEPLOYMENT STATUS ---
    echo Environment Readiness  : !APP_READY!
    echo ===============================================================================
) > "!REPORT_FILE!"

echo.
echo ===============================================================================
if "%APP_READY%"=="READY" (
    echo   [SUCCESS] ENVIRONMENT DEPLOYMENT COMPLETED SUCCESSFULLY!
    echo   Readiness Flag: READY
) else (
    echo   [ERROR] ENVIRONMENT SETUP COMPLETED WITH WARNINGS/FAILURES!
    echo   Readiness Flag: FAILED
)
echo.
echo   Diagnostics report generated at:
echo   "%REPORT_FILE%"
echo ===============================================================================
echo.
timeout /t 3 >nul 2>nul || pause
exit /b 0
