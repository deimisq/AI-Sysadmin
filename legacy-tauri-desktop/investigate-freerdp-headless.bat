@echo off
REM FreeRDP Headless Mode Investigation Script
REM This script tests various FreeRDP parameters to find headless rendering options

echo ========================================
echo FreeRDP Headless Mode Investigation
echo ========================================
echo.

REM Check if wfreerdp is available
where wfreerdp >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] wfreerdp not found in PATH
    echo Please install FreeRDP first
    pause
    exit /b 1
)

echo [1/5] Getting FreeRDP version...
wfreerdp --version
echo.

echo [2/5] Checking all available options...
wfreerdp --help > freerdp_help.txt
echo Full help saved to: freerdp_help.txt
echo.

echo [3/5] Looking for headless/video/offscreen options...
findstr /i "headless video offscreen gfx framebuffer screenshot dump export" freerdp_help.txt
echo.

echo [4/5] Graphics-related options:
findstr /i "/gfx /video /gdi /rfx /nsc /jpeg" freerdp_help.txt
echo.

echo [5/5] Display options:
findstr /i "/window /multimon /span /smart /decorations" freerdp_help.txt
echo.

echo ========================================
echo Investigation Complete
echo ========================================
echo.
echo Check freerdp_help.txt for full options list
echo.

REM Test: Can we minimize/hide window?
echo Testing window control options:
findstr /i "/window-position /workarea /grab-keyboard" freerdp_help.txt
echo.

echo.
echo Next Step: Review the output above for any of these keywords:
echo   - headless
echo   - offscreen
echo   - framebuffer
echo   - video-child
echo   - gfx:
echo   - dump
echo   - screenshot
echo.
pause
