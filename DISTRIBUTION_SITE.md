# 🌐 Sitio de Distribución - AI Sysadmin Agent

## ✅ Configuración Completada

Se ha creado exitosamente un sitio web profesional para distribuir el AI Sysadmin Agent en el dominio **agent.sentrait.com.uy**.

### 📁 Estructura

```
/var/www/agent/
├── index.html                      # Landing page profesional
└── ai-sysadmin-release.tar.gz     # Paquete de distribución (~559MB)
```

### 🔧 Configuración Técnica

1.  **Nginx del Host** (Puerto 8080):
    *   Sirve el contenido estático desde `/var/www/agent`
    *   Configuración: `/etc/nginx/sites-available/agent.sentrait.com.uy`

2.  **Nginx de Docker** (Puertos 80/443):
    *   Hace proxy de `agent.sentrait.com.uy` al puerto 8080 del host
    *   Maneja SSL/TLS automáticamente
    *   Configuración: `nginx/conf.d/default.conf`

### 🌐 URLs Disponibles

*   **Sitio Web:** https://agent.sentrait.com.uy
*   **Descarga Directa:** https://agent.sentrait.com.uy/ai-sysadmin-release.tar.gz

### 📥 Descarga vía Terminal

```bash
curl -O https://agent.sentrait.com.uy/ai-sysadmin-release.tar.gz
```

### 🎨 Características del Sitio

*   ✅ Diseño moderno y profesional
*   ✅ Responsive (móvil y desktop)
*   ✅ Colores corporativos de Sentrait (azules)
*   ✅ Secciones:
    *   Hero con llamado a la acción
    *   Características del producto
    *   Instrucciones de instalación paso a paso
    *   Requisitos del sistema
    *   Sección de descarga destacada
*   ✅ Optimizado para SEO
*   ✅ Headers de seguridad configurados

### 🔄 Actualización del Paquete

Para actualizar el archivo de distribución en el futuro:

```bash
cd /home/ubuntu/ai_agent
./package_release.sh
tar -czf ai-sysadmin-release.tar.gz dist/
sudo cp ai-sysadmin-release.tar.gz /var/www/agent/
```

### 📝 Notas

*   El sitio usa certificados SSL autofirmados (los mismos que testing.sentrait.com.uy)
*   Para producción, considera configurar certificados válidos de Let's Encrypt
*   El DNS debe apuntar `agent.sentrait.com.uy` a la IP del servidor
