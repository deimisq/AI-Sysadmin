# 📦 Guía de GitHub Releases para AI Sysadmin Agent

## ✅ Problema Resuelto

GitHub tiene un límite de **100 MB** por archivo en repositorios git, pero nuestro binario compilado es de **122 MB**.

**Solución**: Usar **GitHub Releases** que soporta archivos hasta **2 GB**.

## 📋 Archivos Preparados

Ya están listos en `releases/ai-sysadmin-agent-v1.0.0/`:

```
releases/ai-sysadmin-agent-v1.0.0/
├── backend-binary-linux-x64.tar.gz    (122 MB) - Binario compilado
├── frontend-build.tar.gz              (22 MB)  - Frontend compilado
├── deployment-files.tar.gz            (13 KB)  - Configs y scripts
├── SHA256SUMS                         - Checksums de seguridad
└── RELEASE_NOTES.md                   - Notas de la versión
```

## 🚀 Opción 1: Crear Release con GitHub CLI (Más Rápido)

### Instalar GitHub CLI (si no lo tienes)

```bash
# Ubuntu/Debian
sudo apt install gh

# O descargar desde: https://cli.github.com/
```

### Autenticar

```bash
gh auth login
```

### Crear el Release

```bash
cd /home/ubuntu/ai_agent

gh release create v1.0.0 \
  releases/ai-sysadmin-agent-v1.0.0/*.tar.gz \
  releases/ai-sysadmin-agent-v1.0.0/SHA256SUMS \
  --title 'AI Sysadmin Agent v1.0.0' \
  --notes-file releases/ai-sysadmin-agent-v1.0.0/RELEASE_NOTES.md \
  --repo sentrait/ai_agent \
  --target Public
```

¡Listo! El release se creará automáticamente con todos los archivos.

## 🌐 Opción 2: Crear Release desde la Web de GitHub

### Paso 1: Ir a GitHub Releases

1. Ve a: https://github.com/sentrait/ai_agent/releases
2. Click en **"Draft a new release"**

### Paso 2: Configurar el Release

- **Tag version**: `v1.0.0`
- **Target**: Selecciona la rama `Public`
- **Release title**: `AI Sysadmin Agent v1.0.0`

### Paso 3: Copiar las Notas del Release

Abre `releases/ai-sysadmin-agent-v1.0.0/RELEASE_NOTES.md` y copia todo el contenido en el campo de descripción.

### Paso 4: Subir los Archivos

Arrastra y suelta estos archivos en la sección "Attach binaries":

```bash
# Desde tu servidor, puedes descargarlos con:
cd /home/ubuntu/ai_agent/releases/ai-sysadmin-agent-v1.0.0/

# Archivos a subir:
- backend-binary-linux-x64.tar.gz
- frontend-build.tar.gz
- deployment-files.tar.gz
- SHA256SUMS
```

### Paso 5: Publicar

- Marca **"Set as the latest release"**
- Click en **"Publish release"**

## 📥 Cómo los Usuarios Descargarán

Una vez publicado, los usuarios podrán descargar así:

```bash
# Descargar todos los archivos del release
wget https://github.com/sentrait/ai_agent/releases/download/v1.0.0/backend-binary-linux-x64.tar.gz
wget https://github.com/sentrait/ai_agent/releases/download/v1.0.0/frontend-build.tar.gz
wget https://github.com/sentrait/ai_agent/releases/download/v1.0.0/deployment-files.tar.gz
wget https://github.com/sentrait/ai_agent/releases/download/v1.0.0/SHA256SUMS

# Verificar integridad
sha256sum -c SHA256SUMS

# Extraer e instalar
tar -xzf deployment-files.tar.gz
mkdir -p backend/dist
tar -xzf backend-binary-linux-x64.tar.gz -C backend/dist/
mkdir -p frontend
tar -xzf frontend-build.tar.gz -C frontend/

# Configurar y ejecutar
cp .env.prod.template .env.prod
nano .env.prod
docker-compose -f docker-compose.prebuilt.yml up -d
```

## 🔄 Para Futuras Versiones

Cuando quieras lanzar una nueva versión:

```bash
# 1. Actualizar VERSION.json
nano VERSION.json  # Cambiar a "1.1.0"

# 2. Compilar nuevos binarios
./build-backend.sh
cd frontend && npm run build && cd ..

# 3. Preparar el release
./prepare-release.sh 1.1.0

# 4. Crear el release en GitHub
gh release create v1.1.0 \
  releases/ai-sysadmin-agent-v1.1.0/*.tar.gz \
  releases/ai-sysadmin-agent-v1.1.0/SHA256SUMS \
  --title 'AI Sysadmin Agent v1.1.0' \
  --notes-file releases/ai-sysadmin-agent-v1.1.0/RELEASE_NOTES.md \
  --repo sentrait/ai_agent \
  --target Public
```

## 📊 Ventajas de GitHub Releases

✅ **Archivos grandes**: Hasta 2 GB por archivo
✅ **Versionado**: Historial claro de versiones
✅ **Descarga rápida**: CDN de GitHub
✅ **Checksums**: Verificación de integridad
✅ **Changelog**: Notas de versión integradas
✅ **Notificaciones**: Los usuarios pueden suscribirse
✅ **API**: Descarga programática
✅ **Gratis**: Sin costo adicional

## 🔐 Seguridad

Los archivos incluyen checksums SHA256 para verificar integridad:

```bash
# Verificar después de descargar
sha256sum -c SHA256SUMS
```

## 📝 Actualizar README.md

Actualiza el README del repositorio público para indicar que los binarios se descargan de Releases:

```markdown
## 📦 Installation

Download the latest release from:
https://github.com/sentrait/ai_agent/releases/latest

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.
```

---

**¡Listo para distribución profesional!** 🎉
