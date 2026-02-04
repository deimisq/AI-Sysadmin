@echo off
REM FreeRDP Headless Mode Investigation - Fixed Script
echo ========================================
echo FreeRDP Headless Investigation
echo ========================================
echo.

REM Check if wfreerdp exists
where wfreerdp >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] wfreerdp not found
    pause
    exit /b 1
)

echo [1/3] Getting FreeRDP version...
wfreerdp --version
echo.

echo [2/3] Generating full help file...
wfreerdp --help > freerdp_help.txt 2>&1
echo Saved to: freerdp_help.txt
echo.

echo [3/3] Analyzing help file contents...
echo.
echo === Searching for relevant keywords ===
echo.

echo Looking for 'video':
type freerdp_help.txt | findstr /i "video"
echo.

echo Looking for 'gfx':
type freerdp_help.txt | findstr /i "gfx"
echo.

echo Looking for 'headless':
type freerdp_help.txt | findstr /i "headless"
echo.

echo Looking for 'dump' or 'screenshot':
type freerdp_help.txt | findstr /i "dump screenshot"
echo.

echo Looking for 'window':
type freerdp_help.txt | findstr /i "window decorations"
echo.

echo ========================================
echo.
echo Please check freerdp_help.txt manually
echo and look for any option related to:
echo  - Frame export
echo  - Offscreen rendering  
echo  - Video output
echo.
echo Opening freerdp_help.txt...
notepad freerdp_help.txt
