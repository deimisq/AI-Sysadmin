@echo off
echo ========================================
echo AI Sysadmin Agent - Frontend Desktop
echo Instalacion de Dependencias
echo ========================================
echo.

echo [1/3] Limpiando node_modules antiguos...
if exist node_modules (
    rmdir /s /q node_modules
    echo Done.
) else (
    echo No node_modules found.
)

echo.
echo [2/3] Limpiando package-lock.json...
if exist package-lock.json (
    del /f /q package-lock.json
    echo Done.
) else (
    echo No package-lock.json found.
)

echo.
echo [3/3] Instalando dependencias...
echo Esto puede tomar algunos minutos...
call npm install

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================
    echo Instalacion completada exitosamente!
    echo ========================================
    echo.
    echo Puedes ejecutar ahora:
    echo   npm run tauri dev    - Modo desarrollo
    echo   npm run tauri build  - Compilar aplicacion
    echo.
) else (
    echo ========================================
    echo ERROR: La instalacion fallo
    echo ========================================
    echo.
    echo Intenta ejecutar manualmente:
    echo   npm install --legacy-peer-deps
    echo.
)

pause
