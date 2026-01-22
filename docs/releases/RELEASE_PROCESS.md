# Proceso Completo de Release - AI Sysadmin Agent

## 📋 Tabla de Contenidos

1. [Preparación Pre-Release](#1-preparación-pre-release)
2. [Actualización de Versión](#2-actualización-de-versión)
3. [Commit y Tagging en GitHub](#3-commit-y-tagging-en-github)
4. [Compilación y Empaquetado](#4-compilación-y-empaquetado)
5. [Publicación en Sitio de Distribución](#5-publicación-en-sitio-de-distribución)
6. [Verificación del Release](#6-verificación-del-release)
7. [Post-Release](#7-post-release)

---

## 1. Preparación Pre-Release

### 1.1 Verificar que Todos los Cambios Estén Completos

Antes de hacer un release, asegúrate de que:

- ✅ Todos los cambios de código están completos y testeados
- ✅ El backend compila sin errores
- ✅ El frontend compila sin errores
- ✅ Los tests críticos pasan (si existen)
- ✅ Las migraciones de base de datos están creadas y testeadas

```bash
cd /home/ubuntu/ai_agent

# Verificar estado de git
git status

# Ver qué archivos se modificaron
git diff
```

### 1.2 Decidir el Número de Versión

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Cambios incompatibles con versiones anteriores
- **MINOR** (0.1.0): Nueva funcionalidad compatible
- **PATCH** (0.0.1): Correcciones de bugs
- **STAGE**: alpha, beta, rc, (vacío para stable)

**Ejemplo para esta release:**
- Versión anterior: `0.9.0-beta9`
- Nueva versión: `0.9.1-beta10`
- Razón: Nuevas funcionalidades (MINOR) + correcciones (PATCH), aún en beta

---

## 2. Actualización de Versión

### 2.1 Actualizar `VERSION.json`

Ubicación: `/home/ubuntu/ai_agent/VERSION.json`

```json
{
    "version": "0.9.1-beta",
    "build": "10",
    "fullVersion": "0.9.1-beta10",
    "name": "AI Sysadmin Agent",
    "releaseDate": "2025-12-05",
    "status": "beta",
    "description": "AI-powered system administration and diagnostics platform",
    "nextMilestone": "1.0.0"
}
```

**Campos a actualizar:**
- `version`: Versión sin build (ej: `0.9.1-beta`)
- `build`: Número de build (incrementar siempre)
- `fullVersion`: Versión completa (ej: `0.9.1-beta10`)
- `releaseDate`: Fecha actual en formato ISO (YYYY-MM-DD)

### 2.2 Actualizar `CHANGELOG.md`

Ubicación: `/home/ubuntu/ai_agent/CHANGELOG.md`

Agregar una nueva sección al inicio del archivo:

```markdown
## [0.9.1-beta] - 2025-12-05

### 🚀 Mejoras Principales

#### Agregado
- **Soporte para Anthropic API directa**: Configuración simplificada para Claude 3.5 Sonnet
- **Bedrock con API Key única**: Simplificado el uso de AWS Bedrock
- **Textarea multilínea en chat de IA**: Soporte para Shift+Enter
- **Adjuntar imágenes en diagnóstico**: Posibilidad de subir capturas de pantalla
- **Recarga dinámica de configuración de IA**: Los cambios se aplican inmediatamente

#### Corregido
- **Error 422 al actualizar servidores**: Corregida conversión de group_id
- **Error 500 al ejecutar comandos**: Corregido schema CommandExecutionResponse
- **SSH faltante en contenedor**: Instalado openssh-client
- **IA respondiendo sobre temas incorrectos**: Corregido orden de parámetros
- **Dimensiones de embeddings incorrectas**: Ajustado de 768 a 1536
- **Validación restrictiva de claves SSH**: Removida validación innecesaria

#### Cambiado
- Frontend: Campo de texto convertido a textarea con placeholder mejorado
- Backend: Servicio de IA ahora soporta configuración dinámica desde base de datos

### Seguridad
- Claves SSH privadas ahora se pueden guardar de forma segura como contenido raw

### Infraestructura
- Instalación de openssh-client en imagen Docker del backend
- Agregada librería langchain-anthropic
```

**Estructura recomendada:**
- **Agregado**: Nuevas funcionalidades
- **Cambiado**: Modificaciones a funcionalidad existente
- **Corregido**: Corrección de bugs
- **Deprecado**: Funcionalidad que será removida
- **Removido**: Funcionalidad eliminada
- **Seguridad**: Cambios relacionados con seguridad
- **Infraestructura**: Cambios en dependencias, Docker, etc.

---

## 3. Commit y Tagging en GitHub

### 3.1 Crear Commit

```bash
cd /home/ubuntu/ai_agent

# Agregar todos los cambios
git add -A

# Crear commit con mensaje descriptivo
git commit -m "Release 0.9.1-beta10: AI improvements, multiline chat, image support, bug fixes

Major improvements:
- Added Anthropic API direct support (Claude 3.5 Sonnet)
- Simplified Bedrock configuration to single API Key
- Multiline textarea in AI chat with Shift+Enter support
- Image attachment capability in diagnostics
- Dynamic AI configuration reload without restart

Bug fixes:
- Fixed 422 error when updating servers
- Fixed 500 error when executing commands
- Fixed AI responding off-topic
- Installed openssh-client for Ansible SSH
- Fixed embedding dimensions (768->1536)
- Removed restrictive SSH key validation

Infrastructure:
- Added langchain-anthropic support
- Improved error handling for LLM APIs"
```

**Buenas prácticas para mensajes de commit:**
- Primera línea: Resumen corto (< 72 caracteres)
- Línea vacía
- Descripción detallada con viñetas
- Agrupa cambios por categoría (Features, Fixes, Infrastructure)

### 3.2 Crear Tag

```bash
# Crear tag anotado
git tag -a v0.9.1-beta10 -m "Release 0.9.1-beta10 - AI improvements, multiline chat, image support"

# Verificar que el tag se creó
git tag -l
```

### 3.3 Push a GitHub

```bash
# Push de la rama testing
git push origin testing

# Push del tag
git push origin v0.9.1-beta10
```

**Verificación:**
- Ir a https://github.com/sentrait/ai_agent
- Verificar que el commit aparece en la rama `testing`
- Ir a "Releases" y verificar que el tag aparece

---

## 4. Compilación y Empaquetado

### 4.1 Ejecutar Script de Empaquetado

El script `package_release.sh` automatiza todo el proceso de compilación y empaquetado.

```bash
cd /home/ubuntu/ai_agent

# Ejecutar el script de empaquetado
./package_release.sh
```

**Este script realiza las siguientes acciones:**

1. **Limpia builds anteriores**
   ```bash
   rm -rf dist/
   mkdir -p dist/images
   mkdir -p dist/nginx/conf.d
   mkdir -p dist/nginx/ssl
   ```

2. **Construye imágenes Docker** (con configuración de producción)
   ```bash
   sudo docker compose -f docker-compose.prod.yml build
   ```
   - Backend: Python bytecode compilado, código fuente removido
   - Frontend: Next.js standalone build optimizado
   - Nginx: Configuración de reverse proxy
   - Postgres: PGVector habilitado

3. **Exporta imágenes a archivos .tar.gz**
   ```bash
   sudo docker save ai_agent-backend:latest | gzip > dist/images/backend.tar.gz
   sudo docker save ai_agent-frontend:latest | gzip > dist/images/frontend.tar.gz
   sudo docker save nginx:alpine | gzip > dist/images/nginx.tar.gz
   sudo docker save pgvector/pgvector:pg15 | gzip > dist/images/postgres.tar.gz
   ```
   - Cada imagen se comprime con gzip para reducir tamaño
   - Tiempo estimado: 5-10 minutos

4. **Copia archivos de configuración**
   ```bash
   cp docker-compose.release.yml dist/docker-compose.yml
   cp nginx/conf.d/default.conf dist/nginx/conf.d/
   ```

5. **Genera scripts de instalación y actualización**
   - `dist/install.sh`: Instalador interactivo para nuevos despliegues
   - `dist/update.sh`: Actualizador automático para instalaciones existentes
   - `dist/README.txt`: Guía de instalación y operación

### 4.2 Contenido del Paquete Generado

```
dist/
├── images/
│   ├── backend.tar.gz      (~200MB)
│   ├── frontend.tar.gz     (~150MB)
│   ├── nginx.tar.gz        (~50MB)
│   └── postgres.tar.gz     (~150MB)
├── nginx/
│   ├── conf.d/
│   │   └── default.conf
│   └── ssl/
│       ├── server.crt (generado en instalación)
│       └── server.key (generado en instalación)
├── docker-compose.yml
├── install.sh              (Instalador interactivo)
├── update.sh               (Script de actualización)
└── README.txt              (Guía completa)
```

### 4.3 Comprimir el Paquete Final

```bash
cd /home/ubuntu/ai_agent

# Crear tarball del directorio dist/
tar -czf ai-sysadmin-release.tar.gz dist/

# Verificar el tamaño
ls -lh ai-sysadmin-release.tar.gz
# Tamaño aproximado: 500-600MB
```

---

## 5. Publicación en Sitio de Distribución

### 5.1 Estructura del Sitio de Distribución

El sitio de distribución está en: `/var/www/agent/`

```
/var/www/agent/
├── index.html                              # Página principal
├── versions.html                           # Historial de versiones
├── versions.json                           # API de versiones
├── favicon.png                             # Icono del sitio
├── ai-sysadmin-release.tar.gz             # Última versión (link simbólico)
├── releases/
│   ├── ai-sysadmin-0.9.0-beta9.tar.gz     # Versiones anteriores
│   └── ai-sysadmin-0.9.1-beta10.tar.gz    # Nueva versión
├── licenses.html                           # Página de licencias
└── license_server.py                       # Servidor de licencias (futuro)
```

### 5.2 Copiar el Paquete al Sitio

```bash
# Copiar tarball principal
sudo cp ai-sysadmin-release.tar.gz /var/www/agent/
sudo chown www-data:www-data /var/www/agent/ai-sysadmin-release.tar.gz

# Copiar versión específica al directorio releases/
sudo cp /var/www/agent/ai-sysadmin-release.tar.gz /var/www/agent/releases/ai-sysadmin-0.9.1-beta10.tar.gz
sudo chown www-data:www-data /var/www/agent/releases/ai-sysadmin-0.9.1-beta10.tar.gz
```

### 5.3 Actualizar `versions.json`

Ubicación: `/var/www/agent/versions.json`

Este archivo alimenta la página de versiones y el sistema de actualización automática.

```json
{
    "latestVersion": "0.9.1-beta10",
    "versions": [
        {
            "version": "0.9.1-beta10",
            "date": "2025-12-05",
            "type": "beta",
            "downloadUrl": "https://agent.sentrait.com.uy/ai-sysadmin-release.tar.gz",
            "highlights": [
                "Soporte para Anthropic API directa (Claude 3.5 Sonnet)",
                "Configuración simplificada de AWS Bedrock",
                "Textarea multilínea en chat de IA con Shift+Enter",
                "Adjuntar imágenes en diagnósticos",
                "Recarga dinámica de configuración de IA"
            ],
            "changelog": [
                "Feature: Direct Anthropic API support (Claude 3.5 Sonnet)",
                "Feature: Simplified Bedrock configuration (single API Key)",
                "Feature: Multiline textarea in AI chat with Shift+Enter support",
                "Feature: Image attachment capability in diagnostics",
                "Feature: Dynamic AI configuration reload without restart",
                "Fix: Error 422 when updating servers (group_id conversion)",
                "Fix: Error 500 when executing commands (schema mismatch)",
                "Fix: SSH client missing in Docker container",
                "Infra: Added langchain-anthropic library"
            ]
        },
        {
            "version": "0.9.0-beta9",
            "date": "2024-12-05",
            "type": "beta",
            "downloadUrl": null,
            "highlights": ["..."],
            "changelog": ["..."]
        }
    ]
}
```

**Actualizar el archivo:**

```bash
# Crear archivo temporal con la nueva versión
cat > /tmp/versions.json << 'EOF'
{
    "latestVersion": "0.9.1-beta10",
    "versions": [
        {
            "version": "0.9.1-beta10",
            ...
        }
    ]
}
EOF

# Copiar al sitio
sudo cp /tmp/versions.json /var/www/agent/versions.json
sudo chown www-data:www-data /var/www/agent/versions.json
```

### 5.4 Actualizar `index.html`

Ubicación: `/var/www/agent/index.html`

Buscar y reemplazar el número de versión en la sección de descarga:

```bash
# Copiar a temporal para editar
sudo cp /var/www/agent/index.html /tmp/index.html
sudo chown ubuntu:ubuntu /tmp/index.html

# Reemplazar versión
sed -i 's/Versión 0.9.0-beta9/Versión 0.9.1-beta10/g' /tmp/index.html

# Devolver al sitio
sudo cp /tmp/index.html /var/www/agent/index.html
sudo chown www-data:www-data /var/www/agent/index.html
```

**Sección a actualizar en index.html:**

```html
<div class="download-box">
    <div class="version-badge" style="background: #ff9800;">Versión 0.9.1-beta10</div>
    <h3 style="margin-bottom: 1.5rem; font-size: 1.8rem;">Paquete Completo de Distribución</h3>
    <p style="margin-bottom: 2rem; opacity: 0.9;">Incluye Backend, Frontend, Base de Datos y Servidor Web pre-configurados</p>
    
    <a href="/ai-sysadmin-release.tar.gz" class="btn" download>
        ⬇️ Descargar Beta (~ 500MB)
    </a>
</div>
```

---

## 6. Verificación del Release

### 6.1 Verificar Acceso al Sitio Web

```bash
# Verificar que el archivo principal se puede descargar
curl -I https://agent.sentrait.com.uy/ai-sysadmin-release.tar.gz

# Debería devolver: HTTP/2 200
# Content-Length: ~563865836 (538MB)
```

### 6.2 Verificar versions.json

```bash
# Verificar que muestra la última versión
curl -s https://agent.sentrait.com.uy/versions.json | jq '.latestVersion'

# Debería devolver: "0.9.1-beta10"
```

### 6.3 Verificar Página Web

Abrir en navegador:
- https://agent.sentrait.com.uy/ (Página principal)
- https://agent.sentrait.com.uy/versions.html (Historial de versiones)

Verificar que:
- ✅ La versión 0.9.1-beta10 aparece como "Latest"
- ✅ El botón de descarga funciona
- ✅ El changelog está completo

### 6.4 Testear Instalación (Opcional pero Recomendado)

En un servidor de prueba:

```bash
# Descargar
curl -L https://agent.sentrait.com.uy/ai-sysadmin-release.tar.gz -o ai-sysadmin-release.tar.gz

# Descomprimir
tar -xzf ai-sysadmin-release.tar.gz
cd dist/

# Ejecutar instalador
./install.sh
```

Verificar que:
- ✅ El instalador se ejecuta sin errores
- ✅ Todas las imágenes Docker se cargan correctamente
- ✅ Los servicios inician correctamente
- ✅ La aplicación es accesible

---

## 7. Post-Release

### 7.1 Notificar a los Usuarios (Opcional)

Si tienes una lista de clientes o usuarios beta:

1. **Email de notificación**
   - Asunto: "Nueva versión 0.9.1-beta10 disponible - AI Sysadmin Agent"
   - Resaltar mejoras principales
   - Incluir link de descarga
   - Mencionar que el `update.sh` puede usarse para actualizar

2. **Actualizar documentación**
   - README.md en GitHub
   - Documentación de usuario si existe

### 7.2 Monitorear Descargas

```bash
# Ver logs de Nginx para monitorear descargas
sudo tail -f /var/log/nginx/access.log | grep "ai-sysadmin-release.tar.gz"
```

### 7.3 Preparar Hotfixes si es Necesario

Si se encuentran bugs críticos después del release:

1. Crear rama `hotfix/0.9.1-beta11`
2. Aplicar correcciones
3. Seguir este mismo proceso para release 0.9.1-beta11

---

## 📊 Checklist Completo de Release

### Pre-Release
- [ ] Todos los cambios de código completos y testeados
- [ ] Backend compila sin errores
- [ ] Frontend compila sin errores
- [ ] Migraciones de BD creadas y testeadas

### Versionado
- [ ] `VERSION.json` actualizado
- [ ] `CHANGELOG.md` actualizado
- [ ] Número de versión decidido correctamente

### Git
- [ ] Commit creado con mensaje descriptivo
- [ ] Tag creado (`v0.9.1-beta10`)
- [ ] Push a GitHub (`testing` branch y tag)

### Compilación
- [ ] Script `package_release.sh` ejecutado
- [ ] Directorio `dist/` generado correctamente
- [ ] Tarball `ai-sysadmin-release.tar.gz` creado

### Publicación
- [ ] Tarball copiado a `/var/www/agent/`
- [ ] Versión específica copiada a `/var/www/agent/releases/`
- [ ] `versions.json` actualizado
- [ ] `index.html` actualizado
- [ ] Permisos correctos (www-data:www-data)

### Verificación
- [ ] URL principal accesible
- [ ] `versions.json` muestra versión correcta
- [ ] Página web muestra versión nueva
- [ ] Descarga funciona
- [ ] (Opcional) Instalación testeada

### Post-Release
- [ ] Notificación a usuarios (si aplica)
- [ ] Monitoreo de descargas iniciado
- [ ] Documentación actualizada

---

## 🚨 Troubleshooting

### Problema: Error al ejecutar package_release.sh

**Síntoma:** El script falla al exportar imágenes Docker

**Solución:**
```bash
# Verificar que las imágenes existen
sudo docker images | grep ai_agent

# Reconstruir si es necesario
sudo docker compose -f docker-compose.prod.yml build --no-cache
```

### Problema: versions.json no actualiza en la web

**Síntoma:** La página muestra la versión antigua

**Solución:**
```bash
# Verificar permisos
ls -l /var/www/agent/versions.json

# Limpiar caché de Cloudflare (si aplica)
# O esperar ~4 horas para que caché expire
```

### Problema: El tarball es demasiado grande

**Síntoma:** El archivo supera 600MB

**Solución:**
- Las imágenes Docker ya están comprimidas con gzip
- Tamaño normal: 500-600MB
- Si excede significativamente, revisar que no se incluyan archivos innecesarios en `dist/`

---

## 📚 Referencias

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Docker Save Documentation](https://docs.docker.com/reference/cli/docker/image/save/)
- GitHub Release Process: https://docs.github.com/en/repositories/releasing-projects-on-github

---

## 📝 Notas Finales

- **Backups**: Siempre mantén al menos las últimas 3 versiones en `/var/www/agent/releases/`
- **Testing**: Idealmente, testea cada release en un entorno de staging antes de publicar
- **Documentación**: Actualiza este documento si el proceso cambia
- **Automatización**: Considera crear un script que automatice los pasos 5.3 y 5.4

---

**Última actualización:** 2025-12-05  
**Versión del documento:** 1.0  
**Autor:** AI Sysadmin Agent Team
