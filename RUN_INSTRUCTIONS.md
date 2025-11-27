# 🚀 Instrucciones para Ejecutar AI Sysadmin Agent

## ✅ Estado Actual

**Backend**: ✅ Compilado exitosamente
- Binario: `backend/dist/sysadmin-agent-backend` (127 MB)
- Compilado con Nuitka (código fuente protegido)

**Frontend**: ✅ Compilado exitosamente
- Build standalone en: `frontend/.next/standalone/`
- Assets estáticos en: `frontend/.next/static/`

## 📋 Opción 1: Ejecución Rápida con Docker (RECOMENDADO)

Esta opción usa los binarios ya compilados y es la más rápida.

### Paso 1: Configurar Variables de Entorno

```bash
cd /home/ubuntu/ai_agent
cp .env.prod.template .env.prod
nano .env.prod
```

**Edita `.env.prod` con estos valores mínimos:**

```env
# Database
POSTGRES_PASSWORD=TuPasswordSegura123!

# Backend Security (genera con los comandos abajo)
SECRET_KEY=tu_secret_key_aqui
ENCRYPTION_KEY=tu_encryption_key_aqui

# AI Configuration
GEMINI_API_KEY=tu_gemini_api_key_aqui

# CORS (opcional, ajusta según tu dominio)
ALLOWED_ORIGINS=http://localhost:3000,http://tu-ip:80
```

**Generar claves de seguridad:**

```bash
# SECRET_KEY
openssl rand -hex 32

# ENCRYPTION_KEY
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Paso 2: Construir y Ejecutar con Docker

```bash
# Construir las imágenes Docker usando los binarios pre-compilados
docker-compose -f docker-compose.prebuilt.yml build

# Iniciar todos los servicios
docker-compose -f docker-compose.prebuilt.yml up -d

# Ver logs
docker-compose -f docker-compose.prebuilt.yml logs -f
```

### Paso 3: Verificar que Todo Está Funcionando

```bash
# Ver estado de los servicios
docker-compose -f docker-compose.prebuilt.yml ps

# Deberías ver:
# - sysadmin-db (postgres)
# - sysadmin-backend
# - sysadmin-frontend
# - sysadmin-nginx
```

### Paso 4: Acceder a la Aplicación

Abre tu navegador en:
- **HTTP**: `http://tu-ip-servidor`
- **Local**: `http://localhost` (si estás en el mismo servidor)

### Paso 5: Crear Usuario Superadmin

```bash
# Ejecutar el script de creación de superusuario
docker exec -it sysadmin-backend /app/backend create-superuser

# O si prefieres hacerlo manualmente:
docker exec -it sysadmin-db psql -U sysadmin -d sysadmin_db
```

### Paso 6: Login y Verificar Licencia

1. Inicia sesión con el superusuario que creaste
2. Ve a **Admin Panel → License**
3. Deberías ver una licencia TRIAL de 30 días activa

## 📋 Opción 2: Ejecución Directa (Sin Docker)

Si prefieres ejecutar directamente en el servidor sin Docker:

### Backend

```bash
cd /home/ubuntu/ai_agent

# Configurar variables de entorno
export DATABASE_URL="postgresql://sysadmin:password@localhost:5432/sysadmin_db"
export SECRET_KEY="tu_secret_key"
export ENCRYPTION_KEY="tu_encryption_key"
export GEMINI_API_KEY="tu_gemini_key"

# Ejecutar el binario compilado
./backend/dist/sysadmin-agent-backend --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd /home/ubuntu/ai_agent/frontend/.next/standalone

# Ejecutar el servidor Next.js
PORT=3000 node server.js
```

### Nginx (Reverse Proxy)

Necesitarás configurar Nginx manualmente para hacer proxy a backend:8000 y frontend:3000.

## 🔧 Comandos Útiles

### Ver logs en tiempo real
```bash
docker-compose -f docker-compose.prebuilt.yml logs -f backend
docker-compose -f docker-compose.prebuilt.yml logs -f frontend
```

### Reiniciar servicios
```bash
docker-compose -f docker-compose.prebuilt.yml restart
```

### Detener todo
```bash
docker-compose -f docker-compose.prebuilt.yml down
```

### Detener y eliminar volúmenes (⚠️ BORRA LA BASE DE DATOS)
```bash
docker-compose -f docker-compose.prebuilt.yml down -v
```

### Backup de la base de datos
```bash
docker exec sysadmin-db pg_dump -U sysadmin sysadmin_db > backup_$(date +%Y%m%d).sql
```

### Restaurar backup
```bash
cat backup_20241127.sql | docker exec -i sysadmin-db psql -U sysadmin sysadmin_db
```

## 🔑 Activación de Licencia Comercial

Una vez que tengas una licencia comercial:

```bash
python3 activate_license.py XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
```

Luego reinicia los servicios:

```bash
docker-compose -f docker-compose.prebuilt.yml restart
```

## 🐛 Troubleshooting

### El backend no inicia
```bash
# Ver logs detallados
docker-compose -f docker-compose.prebuilt.yml logs backend

# Verificar que PostgreSQL está corriendo
docker-compose -f docker-compose.prebuilt.yml ps postgres
```

### El frontend no carga
```bash
# Verificar logs
docker-compose -f docker-compose.prebuilt.yml logs frontend

# Verificar que el backend está accesible
curl http://localhost:8000/health
```

### Error de permisos en binario
```bash
chmod +x backend/dist/sysadmin-agent-backend
```

### Problemas de conexión a la base de datos
```bash
# Verificar que PostgreSQL está saludable
docker-compose -f docker-compose.prebuilt.yml exec postgres pg_isready

# Conectarse manualmente
docker-compose -f docker-compose.prebuilt.yml exec postgres psql -U sysadmin -d sysadmin_db
```

## 📊 Monitoreo

### Ver uso de recursos
```bash
docker stats
```

### Ver espacio en disco
```bash
docker system df
```

### Limpiar imágenes no usadas
```bash
docker system prune -a
```

## 🔒 Seguridad

1. **Cambia las contraseñas por defecto** en `.env.prod`
2. **Configura HTTPS** en Nginx (coloca certificados SSL en `nginx/ssl/`)
3. **Restringe ALLOWED_ORIGINS** a tu dominio real
4. **Firewall**: Solo expón puertos 80 y 443
5. **Backups regulares** de la base de datos

## 📝 Notas Importantes

- **Licencia TRIAL**: 30 días automáticos al primer inicio
- **Binarios compilados**: El código fuente está protegido
- **Actualizaciones**: Se distribuirán como nuevas imágenes Docker
- **Soporte**: Contacta a support@yourdomain.com

---

¡Listo para producción! 🎉
