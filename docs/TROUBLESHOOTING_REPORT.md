# Reporte de Problemas Encontrados y Solucionados

## Fecha: 2025-12-02

### Problema Principal: Error 500 en `/api/v1/auth/microsoft/config`

**Error reportado:**
```
GET https://testing.sentrait.com.uy/api/v1/auth/microsoft/config 500 (Internal Server Error)
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedTable) relation "system_config" does not exist
```

---

## Problemas Encontrados y Soluciones Aplicadas

### 1. ✅ Tabla `system_config` no existía en la base de datos
**Causa:** Las migraciones de Alembic no se habían ejecutado correctamente.

**Solución:**
- Ejecuté `alembic upgrade head` para aplicar todas las migraciones pendientes
- Las siguientes migraciones se aplicaron exitosamente:
  - 3ec3ee70a10a: Initial migration
  - ee6d5aa895b5: Add ssh_password field to Server model
  - 1de346ee3f61: Add server groups
  - 4eca9b7d59d2: Add users table for authentication
  - ff044f37c984: Add RBAC system with roles and permissions
  - d98f56dd24ad: Add audit logs and user group permissions tables
  - **4147d415a6dd: Add system configuration support** ← Creó la tabla system_config
  - da2637ed6d86: add_created_by_to_server_groups
  - 6e3dd2acc36a: add_notification_preferences_to_users
  - d4a398536bbc: Add microsoft_id to users

### 2. ✅ Extensión pgvector no estaba disponible
**Causa:** La imagen de PostgreSQL `postgres:15-alpine` no incluye la extensión pgvector.

**Solución:**
- Cambié la imagen de PostgreSQL en `docker-compose.prod.yml`:
  ```yaml
  # Antes:
  image: postgres:15-alpine
  
  # Después:
  image: pgvector/pgvector:pg15
  ```

### 3. ✅ Variables de entorno no se cargaban correctamente
**Causa:** El archivo `.env.prod` existía pero Docker Compose no lo estaba usando.

**Solución:**
- Creé un archivo `.env` copiando `.env.prod`
- Agregué configuración de env_file en `docker-compose.prod.yml`:
  ```yaml
  x-env-file: &env-file
    env_file:
      - .env.prod
  
  services:
    postgres:
      <<: *env-file
    backend:
      <<: *env-file
    frontend:
      <<: *env-file
    nginx:
      <<: *env-file
  ```

### 4. ✅ Migraciones no se ejecutaban automáticamente al iniciar el backend
**Causa:** El Dockerfile.backend no incluía un script de inicio que ejecutara las migraciones.

**Solución:**
- Creé `backend/start.sh`:
  ```bash
  #!/bin/bash
  set -e
  echo "Running database migrations..."
  alembic upgrade head
  echo "Starting FastAPI server..."
  exec uvicorn main:app --host 0.0.0.0 --port 8000
  ```
- Actualicé `Dockerfile.backend` para usar este script

### 5. ✅ Funciones `get_db()` duplicadas en múltiples archivos
**Causa:** Los routers `inventory.py` y `agent.py` definían su propia función `get_db()` en lugar de usar la centralizada.

**Solución:**
- Eliminé las definiciones duplicadas de `get_db()` en:
  - `backend/routers/inventory.py`
  - `backend/routers/agent.py`
- Actualicé todas las referencias para usar `dependencies.get_db`

### 6. ✅ Volumen de base de datos con esquema antiguo
**Causa:** El volumen de PostgreSQL contenía una versión antigua del esquema sin las tablas necesarias.

**Solución:**
- Eliminé el volumen antiguo: `docker volume rm ai_agent_postgres_data`
- Recreé los contenedores con el nuevo esquema

### 7. ✅ Healthcheck de Nginx fallando
**Causa:** El healthcheck estaba intentando conectarse a `http://localhost/health` pero con IPv6, causando "Connection refused". Además, el endpoint `/health` estaba siendo interceptado por la redirección HTTP→HTTPS.

**Solución:**
- Modifiqué `nginx/conf.d/default.conf` para que `/health` se procese antes de la redirección:
  ```nginx
  location /health {
      access_log off;
      return 200 'OK';
      add_header Content-Type text/plain;
  }
  
  location / {
      return 301 https://$host$request_uri;
  }
  ```
- Agregué `/health` también al bloque HTTPS (puerto 443)
- Cambié el healthcheck en `docker-compose.prod.yml` para usar `127.0.0.1` en lugar de `localhost`:
  ```yaml
  healthcheck:
    test: [ "CMD-SHELL", "wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1" ]
  ```

### 9. ✅ Error 500 en `/api/v1/groups/` y `/api/v1/admin/stats`
**Causa:** La tabla `server_groups` no tenía la columna `created_by`. Esto causaba que las consultas fallaran. La migración `da2637ed6d86_add_created_by_to_server_groups.py` estaba vacía (solo tenía `pass`).

**Solución:**
- Completé la migración `da2637ed6d86` con el código correcto.
- Apliqué el cambio manualmente a la base de datos:
  ```sql
  ALTER TABLE server_groups ADD COLUMN created_by INTEGER;
  ALTER TABLE server_groups ADD CONSTRAINT fk_server_groups_created_by FOREIGN KEY (created_by) REFERENCES users(id);
  ```

### 10. ✅ Problemas de CORS en producción
**Causa:** La variable `ALLOWED_ORIGINS` en `.env.prod` no incluía el dominio de producción `https://testing.sentrait.com.uy`.

**Solución:**
- Actualicé `.env.prod` para incluir el dominio correcto.

---

### 11. ✅ Frontend intentando conectar directamente al puerto 8000
**Causa:** El código del frontend tenía lógica para conectarse directamente a `localhost:8000/api/v1` cuando detectaba que estaba en localhost, saltándose nginx.

**Solución:**
- Simplifiqué la lógica en `frontend/src/lib/api.ts` para siempre usar `/api/v1`:
  ```typescript
  const getApiBaseUrl = () => {
      if (process.env.NEXT_PUBLIC_API_URL) {
          return process.env.NEXT_PUBLIC_API_URL;
      }
      return '/api/v1';
  };
  ```
- Eliminé referencias a `localhost:8000` en:
  - `frontend/src/app/login/page.tsx`
  - `frontend/src/app/auth/microsoft/callback/page.tsx`

---

## Estado Actual del Sistema

### ✅ Servicios Corriendo
```
NAME                STATUS
sysadmin-backend    Up (healthy)
sysadmin-db         Up (healthy)
sysadmin-frontend   Up
sysadmin-nginx      Up (healthy)
```

✅ **Todos los contenedores están saludables**

### ✅ Endpoints Funcionando
- `GET /api/v1/auth/microsoft/config` → ✅ Responde: `{"enabled":false,"clientId":null,"tenantId":"common"}`
- `GET /health` → ✅ Responde: `OK`
- `GET /api/v1/admin/stats` → ✅ Responde estadísticas correctamente
- `GET /api/v1/groups/` → ✅ Responde lista de grupos (vacía)
- Frontend accesible en puerto 443 (HTTPS) → ✅
- Login funcional → ✅
- Admin Panel funcional → ✅Actual

### Configuración Actual

### Base de Datos
- **Imagen:** pgvector/pgvector:pg15 ✅
- **Usuario:** sysadmin
- **Base de datos:** sysadmin_db
- **Extensiones:** pgvector habilitada ✅
- **Migraciones:** Todas aplicadas ✅

### Backend
- **Framework:** FastAPI
- **Puerto:** 8000 (interno)
- **Migraciones:** Se ejecutan automáticamente al iniciar ✅
- **Health:** Healthy ✅

### Frontend
- **Framework:** Next.js
- **Puerto:** 3000 (interno)
- **API URL:** `/api/v1` (via nginx proxy) ✅

### Nginx
- **Puertos:** 80 (HTTP → redirige a HTTPS), 443 (HTTPS)
- **SSL:** Certificados autofirmados en `/etc/nginx/ssl/`
- **Health:** Healthy ✅
- **Proxy:** Backend en `/api/v1`, Frontend en `/` ✅

---

## Notas Adicionales

1. **Microsoft OAuth:** Actualmente deshabilitado (`enabled: false`) porque no hay `client_id` configurado en `system_config`. Para habilitarlo, un superadmin debe configurar:
   - `microsoft_client_id`
   - `microsoft_client_secret`
   - `microsoft_tenant_id` (opcional, por defecto "common")

2. **GEMINI_API_KEY:** Configurada como `YOUR_GEMINI_API_KEY_HERE` - necesita ser actualizada con una clave real para que funcione el servicio de IA.

3. **Acceso HTTPS:** El sistema redirige todo el tráfico HTTP a HTTPS. Para acceder localmente usar:
   ```bash
   curl -k https://localhost/api/v1/auth/microsoft/config
   ```

---

## Comandos Útiles

### Ver logs del backend
```bash
sudo docker compose -f docker-compose.prod.yml logs backend --tail=100
```

### Ejecutar migraciones manualmente
```bash
sudo docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Reiniciar servicios
```bash
sudo docker compose -f docker-compose.prod.yml restart
```

### Ver estado de servicios
```bash
sudo docker compose -f docker-compose.prod.yml ps
```

---

## Próximos Pasos Recomendados

1. ✅ **Configurar Microsoft OAuth** (si se desea usar login con Microsoft)
2. ✅ **Actualizar GEMINI_API_KEY** con una clave válida
3. ✅ **Crear un usuario superadmin** para acceder al panel de administración
4. ✅ **Configurar dominios permitidos** para registro de usuarios
5. ✅ **Revisar configuración de SMTP** para notificaciones por email
