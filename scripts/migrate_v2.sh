#!/bin/bash
set -e

echo "🚀 Iniciando Migración a Arquitectura V2..."

ROOT_DIR=$(pwd)

# 1. Mover Frontend Web (Next.js)
if [ -d "frontend" ] && [ ! -d "frontend-web" ]; then
    echo "📦 Migrando 'frontend' -> 'frontend-web'..."
    mv frontend frontend-web
fi

# 2. Crear nueva estructura para Desktop UI
if [ ! -d "frontend-desktop-ui" ]; then
    echo "📂 Creando directorio 'frontend-desktop-ui'..."
    mkdir -p frontend-desktop-ui
fi

# 3. Migrar UI de Escritorio (De Tauri a React Puro)
if [ -d "frontend-desktop" ]; then
    echo "📦 Extrayendo UI de 'frontend-desktop'..."
    
    # Copiar archivos de configuración y fuentes
    cp -r frontend-desktop/src frontend-desktop-ui/
    cp -r frontend-desktop/public frontend-desktop-ui/
    cp frontend-desktop/index.html frontend-desktop-ui/
    cp frontend-desktop/package.json frontend-desktop-ui/
    cp frontend-desktop/vite.config.ts frontend-desktop-ui/ 2>/dev/null || true
    cp frontend-desktop/tsconfig.json frontend-desktop-ui/ 2>/dev/null || true
    cp frontend-desktop/tsconfig.app.json frontend-desktop-ui/ 2>/dev/null || true
    cp frontend-desktop/tsconfig.node.json frontend-desktop-ui/ 2>/dev/null || true
    cp frontend-desktop/tailwind.config.js frontend-desktop-ui/ 2>/dev/null || true
    cp frontend-desktop/postcss.config.js frontend-desktop-ui/ 2>/dev/null || true
    
    echo "✅ UI extraída correctamente."
    
    # Renombrar carpeta vieja a legacy para seguridad (no borrar aún)
    echo "🔒 Archivando 'frontend-desktop' como 'legacy-tauri-desktop'..."
    mv frontend-desktop legacy-tauri-desktop
fi

# 4. Asegurar estructura de Apps
if [ ! -d "apps/windows" ]; then
    echo "📂 Creando estructura 'apps/windows'..."
    mkdir -p apps/windows
    # (Ya creé los archivos .csproj y .xaml antes con la herramienta, así que estarán ahí si no borré)
fi

echo "📝 Actualizando referencias en docker-compose (si es necesario)..."
# (Por ahora no toco docker-compose porque docker solo corría 'backend' y 'frontend' web.
#  Como renombré 'frontend' a 'frontend-web', sí debo actualizar docker-compose.yml)

sed -i 's|build: ./frontend|build: ./frontend-web|g' docker-compose.yml
sed -i 's|volumes: ./frontend|volumes: ./frontend-web|g' docker-compose.yml 2>/dev/null || true

# También en docker-compose.prod.yml y release si existen
if [ -f "docker-compose.prod.yml" ]; then
    sed -i 's|build: ./frontend|build: ./frontend-web|g' docker-compose.prod.yml
fi
if [ -f "docker-compose.release.yml" ]; then
    sed -i 's|build: ./frontend|build: ./frontend-web|g' docker-compose.release.yml
fi

echo "✅ Migración completada exitosamente."
echo "   - Web Frontend: /frontend-web"
echo "   - Desktop UI:   /frontend-desktop-ui (React puro, sin Tauri)"
echo "   - Native App:   /apps/windows (.NET Project)"
echo "   - Legacy:       /legacy-tauri-desktop"
