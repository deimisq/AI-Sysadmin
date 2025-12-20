# 🌐 Sitio de Distribución - AI Sysadmin Agent

## ✅ Configuración Completada

Se ha creado exitosamente un sitio web profesional para distribuir el AI Sysadmin Agent en el dominio **agent.sentrait.com.uy**.

---

## 📁 Estructura del Sitio

```
/var/www/agent/
├── index.html                              # Landing page profesional
├── versions.html                           # Página de historial de versiones
├── versions.json                           # API JSON con información de versiones
├── licenses.html                           # Página de licencias
├── ai-sysadmin-release.tar.gz             # Paquete actual (~542MB)
├── favicon.png                             # Icono del sitio
├── releases/
│   ├── ai-sysadmin-0.9.4-beta14.tar.gz   # Versiones archivadas
│   ├── ai-sysadmin-0.9.3-beta.tar.gz
│   └── ...
└── license_server.py                       # Servidor de licencias (futuro)
```

---

## 🔧 Configuración Técnica

### 1. Nginx del Host (Puerto 8080)
- Sirve el contenido estático desde `/var/www/agent`
- Configuración: `/etc/nginx/sites-available/agent.sentrait.com.uy`

### 2. Nginx de Docker (Puertos 80/443)
- Hace proxy de `agent.sentrait.com.uy` al puerto 8080 del host
- Maneja SSL/TLS automáticamente
- Configuración: `nginx/conf.d/default.conf`

---

## 🌐 URLs Disponibles

- **Sitio Web:** https://agent.sentrait.com.uy
- **Descarga Directa:** https://agent.sentrait.com.uy/ai-sysadmin-release.tar.gz
- **Historial de Versiones:** https://agent.sentrait.com.uy/versions.html
- **API JSON:** https://agent.sentrait.com.uy/versions.json

### 📥 Descarga vía Terminal

```bash
curl -O https://agent.sentrait.com.uy/ai-sysadmin-release.tar.gz
```

---

## 📋 Requisitos del Sistema (ESTÁNDAR UNIFICADO)

⚠️ **IMPORTANTE**: Estos requisitos DEBEN ser idénticos en todos los documentos (README.md, index.html, versions.html)

### Mínimos
- 2 CPU cores
- 2GB RAM
- 10GB disk space
- Docker 20.10+
- Docker Compose 2.0+

### Recomendados
- 4 CPU cores
- 4GB RAM
- 20GB SSD
- Ubuntu 20.04+ or similar

---

## 📄 Formato de Archivos Clave

### index.html

**Elementos críticos:**
1. Badge de versión en hero section: `🚧 VERSIÓN BETA 0.9.4-beta14`
2. Badge en sección de descarga: `<div class="version-badge">Versión 0.9.4-beta14</div>`
3. Requisitos del sistema en sección de requisitos: `2GB RAM mínimo (4GB recomendado)`

### versions.html

**Estructura OBLIGATORIA (NO CAMBIAR):**

```html
<!-- 1. Header con logo y navegación -->
<header>
    <div class="logo">AI Sysadmin Agent</div>
    <p>Historial de Versiones</p>
</header>

<!-- 2. Banner verde de última versión CON BOTÓN DE DESCARGA -->
<div class="latest-banner">
    <h2>🎉 Última Versión: 0.9.4-beta14</h2>
    <p>Fecha de lanzamiento: 20 de Diciembre, 2025</p>
    <a href="/ai-sysadmin-release.tar.gz" class="download-btn" download>
        ⬇️ Descargar v0.9.4-beta14 (~542MB)
    </a>
</div>

<!-- 3. MÓDULO DE INSTRUCCIONES (DEBE IR AQUÍ, ENTRE BANNER Y CHANGELOGS) -->
<div class="instructions-box">
    <h3>📋 Instrucciones de Instalación</h3>
    <div class="instructions-steps">
        <ol>
            <li>
                <strong>Descargar el paquete:</strong>
                <div class="code-block">curl -O https://agent.sentrait.com.uy/ai-sysadmin-release.tar.gz</div>
            </li>
            <li>
                <strong>Descomprimir el archivo:</strong>
                <div class="code-block">tar -xzf ai-sysadmin-release.tar.gz<br>cd dist/</div>
            </li>
            <li>
                <strong>Ejecutar el instalador interactivo:</strong>
                <div class="code-block">./install.sh</div>
                <p style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.8;">
                    El instalador te guiará paso a paso en la configuración
                </p>
            </li>
            <li>
                <strong>Acceder a la aplicación:</strong>
                <p style="margin-top: 0.5rem;">
                    Una vez instalado, accede a <code>http://tu-servidor-ip</code>
                </p>
            </li>
        </ol>
        <p style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.95rem;">
            <strong>Requisitos mínimos:</strong> Docker 20.10+, Docker Compose 2.0+, 2GB RAM, 10GB espacio en disco
        </p>
    </div>
</div>

<!-- 4. Changelogs de versiones (de más reciente a más antigua) -->
<div class="version-card">
    <!-- Versión 0.9.4-beta14 con badge ÚLTIMA -->
    ...
</div>
<div class="version-card">
    <!-- Versión 0.9.3-beta -->
    ...
</div>
<!-- ... resto de versiones ... -->
```

**Orden CRÍTICO en versions.html:**
1. Header
2. Banner verde con botón de descarga
3. **Módulo de instrucciones de instalación** ← NO OMITIR
4. Changelogs de versiones

**Estilos CSS requeridos:**
- `.latest-banner` - fondo verde, padding 2rem
- `.download-btn` - botón blanco sobre verde
- `.instructions-box` - fondo azul oscuro, borde azul
- `.code-block` - fondo negro, texto verde, fuente monospace
- `.version-card` - cards individuales para cada versión

### versions.json

**Formato OBLIGATORIO:**

```json
{
    "latestVersion": "0.9.4-beta14",
    "versions": [
        {
            "version": "0.9.4-beta14",
            "date": "2025-12-20",
            "type": "beta",
            "downloadUrl": "https://agent.sentrait.com.uy/ai-sysadmin-release.tar.gz",
            "highlights": [
                "Característica 1",
                "Característica 2",
                "..."
            ],
            "changelog": [
                "Feature: ...",
                "Fix: ...",
                "Infra: ...",
                "..."
            ]
        },
        {
            "version": "0.9.3-beta",
            "date": "2025-12-19",
            "type": "beta",
            "downloadUrl": null,
            "highlights": ["..."],
            "changelog": ["..."]
        }
        // ... mantener al menos las últimas 5 versiones
    ]
}
```

**Reglas para versions.json:**
- `latestVersion` DEBE coincidir con `versions[0].version`
- Solo la última versión tiene `downloadUrl` (las demás null)
- Mantener al menos 5 versiones en el historial
- Cada versión DEBE tener highlights Y changelog completo
- Changelog debe usar prefijos: `Feature:`, `Fix:`, `Infra:`, `Security:`, `Changed:`

---

## 🔄 Actualización del Paquete

### Proceso completo para nuevo release:

```bash
# 1. En el repositorio
cd /home/ubuntu/ai_agent

# 2. Actualizar VERSION.json
# {
#   "version": "0.9.X-beta",
#   "build": "XX",
#   "fullVersion": "0.9.X-betaXX",
#   "releaseDate": "2025-XX-XX"
# }

# 3. Ejecutar script de empaquetado
./scripts/package_release.sh

# 4. Comprimir el paquete
tar -czf ai-sysadmin-release.tar.gz dist/

# 5. Copiar al sitio de distribución
sudo cp ai-sysadmin-release.tar.gz /var/www/agent/
sudo cp /var/www/agent/ai-sysadmin-release.tar.gz /var/www/agent/releases/ai-sysadmin-0.9.X-betaXX.tar.gz

# 6. Establecer permisos
sudo chown www-data:www-data /var/www/agent/ai-sysadmin-release.tar.gz
sudo chown www-data:www-data /var/www/agent/releases/ai-sysadmin-0.9.X-betaXX.tar.gz

# 7. Actualizar versions.json
# Editar /var/www/agent/versions.json
# - Actualizar latestVersion
# - Agregar nueva versión al inicio del array versions[]
sudo chown www-data:www-data /var/www/agent/versions.json

# 8. Actualizar index.html
sudo sed -i 's/VERSIÓN BETA 0.9.X-betaYY/VERSIÓN BETA 0.9.X-betaXX/g' /var/www/agent/index.html
sudo sed -i 's/Versión 0.9.X-betaYY/Versión 0.9.X-betaXX/g' /var/www/agent/index.html

# 9. Actualizar versions.html
# - Cambiar banner verde: "Última Versión: 0.9.X-betaXX"
# - Cambiar fecha: "Fecha de lanzamiento: XX de Mes, 2025"
# - Cambiar link de descarga en banner
# - Agregar nueva version-card al inicio (después de instructions-box)
# - Mover badge "ÚLTIMA" a la nueva versión
sudo chown www-data:www-data /var/www/agent/versions.html

# 10. Verificar
curl -I https://agent.sentrait.com.uy/ai-sysadmin-release.tar.gz
curl -s https://agent.sentrait.com.uy/versions.json | jq '.latestVersion'
```

---

## ✨ Características del Sitio

- ✅ Diseño moderno y profesional
- ✅ Responsive (móvil y desktop)
- ✅ Colores corporativos de Sentrait (azules/verdes)
- ✅ Secciones:
  - Hero con llamado a la acción
  - Características del producto
  - **Instrucciones de instalación paso a paso** (versions.html)
  - Requisitos del sistema
  - Sección de descarga destacada
  - Historial completo de versiones
- ✅ Optimizado para SEO
- ✅ Headers de seguridad configurados

---

## 🎨 Paleta de Colores

```css
:root {
    --primary: #2563eb;        /* Azul principal */
    --primary-dark: #1d4ed8;   /* Azul oscuro */
    --secondary: #0ea5e9;      /* Azul claro */
    --accent: #f97316;         /* Naranja */
    --success: #22c55e;        /* Verde (banner latest) */
    --warning: #eab308;        /* Amarillo (badge beta) */
    --bg-dark: #0f172a;        /* Fondo oscuro */
    --bg-card: #1e293b;        /* Fondo de cards */
}
```

---

## 🚨 Puntos Críticos a NO Olvidar

### ❌ Errores Comunes a Evitar:

1. **NO omitir el módulo de instrucciones** en versions.html
2. **NO cambiar los requisitos** sin actualizar TODOS los archivos
3. **NO olvidar el botón de descarga** en el banner verde de versions.html
4. **NO dejar downloadUrl** en versiones antiguas (solo en la última)
5. **NO olvidar actualizar** latestVersion en versions.json
6. **NO omitir changelogs completos** en versions.json

### ✅ Checklist Pre-Release:

- [ ] VERSION.json actualizado
- [ ] versions.json con nueva versión al inicio
- [ ] versions.json: latestVersion actualizado
- [ ] versions.json: downloadUrl solo en última versión
- [ ] index.html: badge de versión actualizado (2 lugares)
- [ ] versions.html: banner verde actualizado
- [ ] versions.html: botón de descarga actualizado
- [ ] versions.html: nueva version-card agregada
- [ ] versions.html: badge ÚLTIMA movido a nueva versión
- [ ] versions.html: módulo de instrucciones presente
- [ ] Requisitos idénticos en README, index, versions
- [ ] Tarball copiado a /var/www/agent/
- [ ] Tarball archivado en releases/
- [ ] Permisos www-data:www-data establecidos

---

## 📝 Notas

- El sitio usa certificados SSL autofirmados (los mismos que testing.sentrait.com.uy)
- Para producción, considerar configurar certificados válidos de Let's Encrypt
- El DNS debe apuntar `agent.sentrait.com.uy` a la IP del servidor
- Mantener al menos las últimas 5 versiones en el historial
- Archivar versiones antiguas en `/var/www/agent/releases/` pero NO eliminarlas

---

## 🔗 Referencias

- Repositorio: https://github.com/sentrait/ai_agent
- Proceso de Release: `/home/ubuntu/ai_agent/docs/RELEASE_PROCESS.md`
- Documentación técnica: `/home/ubuntu/ai_agent/docs/`

---

**Última actualización:** 2025-12-20  
**Versión del documento:** 2.0  
**Autor:** AI Sysadmin Agent Team
