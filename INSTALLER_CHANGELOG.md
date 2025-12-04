# 🔧 Correcciones del Instalador - Historial

## Versión 0.9.0-beta - Iteraciones de Mejora

### Iteración 1: Compatibilidad Docker Compose
**Problema:** El instalador solo funcionaba con Docker Compose v2
**Solución:** Detección automática de v1 (`docker-compose`) y v2 (`docker compose`)
**Commit:** 607f6d4e

### Iteración 2: Conflictos de Puertos
**Problema:** Error "Port 80 is already in use" cuando hay servicios corriendo
**Solución:** 
- Detección automática de puertos ocupados
- 3 opciones: detener servicios, usar puertos alternativos, o salir
- Configuración dinámica de HTTP_PORT y HTTPS_PORT
**Commit:** 326dc713

### Iteración 3: Error ContainerConfig
**Problema:** `KeyError: 'ContainerConfig'` con Docker Compose v1 y contenedores existentes
**Solución:** Limpieza automática de contenedores existentes antes de iniciar
**Commit:** 3b8b7175

### Iteration 5: Migraciones Desaparecidas (Code Obfuscation)
**Problema:** El backend no ejecutaba migraciones porque los archivos `.py` de Alembic eran eliminados por la ofuscación.
**Solución:** Excluir el directorio `alembic/` de la eliminación de archivos fuente en `Dockerfile.backend`.
**Commit:** [Actual]

---

### Iteración 4: Migraciones de Base de Datos
**Problema:** "relation 'allowed_domains' does not exist" - migraciones no completadas
**Solución:** 
- Espera activa verificando que las tablas existan
- Timeout de 120 segundos (60 retries x 2s)
- Mensajes claros si las migraciones fallan
**Commit:** [Actual]

---

## Características Finales del Instalador

### ✅ Verificaciones Automáticas
1. Docker instalado
2. Docker Compose (v1 o v2)
3. Puertos 80/443 disponibles
4. Contenedores existentes
5. Base de datos lista
6. Migraciones completadas

### ✅ Configuración Interactiva
- Dominio/IP del servidor
- Credenciales de base de datos
- API Key de Gemini
- Configuración SMTP (opcional)
- Usuario superadmin

### ✅ Manejo de Errores
- Mensajes claros y descriptivos
- Opciones de resolución automática
- Instrucciones para resolución manual
- Logs detallados

### ✅ Compatibilidad
- Ubuntu/Debian
- CentOS/RHEL
- Docker Compose v1 y v2
- Puertos estándar o alternativos
- Instalación limpia o actualización

---

## Flujo del Instalador

```
1. Verificar Docker
   ├─ Instalado? → Continuar
   └─ No instalado → Mostrar instrucciones y salir

2. Verificar Docker Compose
   ├─ v2 detectado → Usar "docker compose"
   ├─ v1 detectado → Usar "docker-compose"
   └─ No detectado → Mostrar instrucciones y salir

3. Verificar Puertos
   ├─ Libres → Usar 80/443
   └─ Ocupados → Ofrecer opciones
       ├─ Detener servicios
       ├─ Usar 8080/8443
       └─ Salir

4. Recolectar Datos
   - Dominio
   - Credenciales BD
   - API Keys
   - SMTP (opcional)
   - Usuario admin

5. Generar Configuración
   - Crear .env
   - Generar claves de seguridad
   - Crear certificados SSL

6. Cargar Imágenes Docker
   - backend.tar.gz
   - frontend.tar.gz
   - nginx.tar.gz
   - postgres.tar.gz

7. Limpiar Contenedores Existentes
   ├─ Existen? → docker compose down -v
   └─ No existen → Continuar

8. Iniciar Servicios
   - docker compose up -d

9. Esperar Base de Datos
   - Loop: pg_isready
   - Timeout: 60s

10. Esperar Migraciones
    - Loop: verificar tabla allowed_domains
    - Timeout: 120s

11. Crear Usuario Superadmin
    - Crear dominio permitido
    - Crear usuario con rol SUPERADMIN

12. Mostrar Resumen
    - URL de acceso
    - Credenciales
    - Comandos útiles
```

---

## Métricas de Robustez

- **Timeouts totales:** ~3 minutos máximo
- **Reintentos automáticos:** 90 (30 para BD + 60 para migraciones)
- **Puntos de verificación:** 6
- **Opciones de resolución:** 3 por cada error común
- **Compatibilidad:** 2 versiones de Docker Compose
- **Flexibilidad de puertos:** Estándar o alternativos

---

## Testing Realizado

### Escenarios Probados
1. ✅ Instalación limpia en Ubuntu 24.04
2. ✅ Docker Compose v1 (1.29.2)
3. ✅ Docker Compose v2 (plugin)
4. ✅ Puerto 80 ocupado por Nginx
5. ✅ Contenedores existentes de instalación previa
6. ✅ Migraciones lentas (>5s)

### Escenarios Pendientes
- [ ] CentOS/RHEL
- [ ] Instalación sin permisos sudo
- [ ] Red corporativa con proxy
- [ ] Múltiples instalaciones en el mismo host

---

## Próximas Mejoras (v0.9.1)

1. **Verificación de recursos:**
   - RAM disponible (mínimo 4GB)
   - Espacio en disco (mínimo 10GB)

2. **Backup automático:**
   - Detectar instalación existente
   - Ofrecer backup antes de actualizar

3. **Modo silencioso:**
   - Instalación no interactiva con archivo de configuración
   - Útil para automatización

4. **Healthcheck post-instalación:**
   - Verificar que todos los servicios respondan
   - Probar login con credenciales creadas

5. **Rollback automático:**
   - Si la instalación falla, restaurar estado anterior

---

**Última actualización:** 2025-12-04  
**Versión del instalador:** 0.9.0-beta.4
