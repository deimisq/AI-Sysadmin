@echo off
echo ========================================
echo FreeRDP Installation Verification
echo ========================================
echo.

echo [1/3] Checking if wfreerdp is in PATH...
where wfreerdp
if %errorlevel% equ 0 (
    echo [OK] wfreerdp found in PATH
) else (
    echo [ERROR] wfreerdp not found in PATH
    echo Please add FreeRDP to your PATH
    pause
    exit /b 1
)
echo.

echo [2/3] Checking FreeRDP version...
wfreerdp --version
echo.

echo [3/3] Listing FreeRDP command line options...
wfreerdp --help | findstr /i "/v: /u: /p: /size: /bpp:"
echo.

echo ========================================
echo Verification Complete!
echo ========================================
echo.
echo FreeRDP is installed correctly.
echo You can now compile and run the app.
echo.
pause
