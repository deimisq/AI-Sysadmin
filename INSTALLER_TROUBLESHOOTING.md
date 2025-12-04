# 🔧 Troubleshooting - Instalador AI Sysadmin Agent

## Problemas Comunes y Soluciones

### ❌ "Docker no está instalado"

**Síntoma:**
```
❌ Docker no está instalado.
```

**Solución:**
Instalar Docker según tu distribución:

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar
```

**CentOS/RHEL:**
```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
```

---

### ❌ "Docker Compose no está instalado"

**Síntoma:**
```
❌ Docker Compose no está instalado.
```

**Solución:**

**Opción 1: Docker Compose v2 (Recomendado)**
```bash
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

**Opción 2: Docker Compose v1 (Legacy)**
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**Verificar instalación:**
```bash
docker compose version
# o
docker-compose --version
```

---

### ❌ "Permission denied" al ejecutar Docker

**Síntoma:**
```
permission denied while trying to connect to the Docker daemon socket
```

**Solución:**
```bash
# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Cerrar sesión y volver a entrar, o ejecutar:
newgrp docker

# Verificar
docker ps
```

---

### ❌ "Port 80 is already in use"

**Síntoma:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:80: bind: address already in use
```

**Solución:**

**Opción 1: Detener el servicio que usa el puerto**
```bash
# Identificar qué usa el puerto 80
sudo lsof -i :80
# o
sudo netstat -tulpn | grep :80

# Detener el servicio (ejemplo con Apache)
sudo systemctl stop apache2
# o con Nginx
sudo systemctl stop nginx
```

**Opción 2: Cambiar puertos en .env**
```bash
# Editar .env antes de iniciar
nano .env

# Cambiar:
HTTP_PORT=8080
HTTPS_PORT=8443
```

---

### ❌ "Tiempo de espera agotado para la base de datos"

**Síntoma:**
```
❌ Tiempo de espera agotado para la base de datos.
```

**Solución:**
```bash
# Verificar logs de postgres
docker compose logs postgres

# Verificar que el contenedor esté corriendo
docker compose ps

# Reiniciar postgres
docker compose restart postgres

# Esperar 30 segundos y verificar
docker compose exec postgres pg_isready -U sysadmin
```

---

### ❌ "Error creando usuario"

**Síntoma:**
```
❌ Error creando usuario: ...
```

**Soluciones:**

**1. Verificar que las migraciones se aplicaron:**
```bash
docker compose logs backend | grep "Running upgrade"
```

**2. Aplicar migraciones manualmente:**
```bash
docker compose exec backend alembic upgrade head
```

**3. Verificar conexión a BD:**
```bash
docker compose exec backend python3 -c "from database import SessionLocal; db = SessionLocal(); print('OK')"
```

---

### ❌ "Cannot connect to the Docker daemon"

**Síntoma:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solución:**
```bash
# Verificar que Docker esté corriendo
sudo systemctl status docker

# Si no está corriendo, iniciarlo
sudo systemctl start docker
sudo systemctl enable docker
```

---

### ⚠️ Certificados SSL Autofirmados

**Síntoma:**
El navegador muestra advertencia de seguridad.

**Solución:**
Esto es normal con certificados autofirmados.

**Opción 1: Aceptar el riesgo (desarrollo/testing)**
- Click en "Avanzado" → "Continuar al sitio"

**Opción 2: Usar certificados válidos**
```bash
# Detener el sistema
docker compose down

# Reemplazar certificados
cp tu_certificado.crt nginx/ssl/server.crt
cp tu_clave_privada.key nginx/ssl/server.key

# Reiniciar
docker compose up -d
```

**Opción 3: Let's Encrypt (recomendado para producción)**
```bash
# Instalar certbot
sudo apt-get install certbot

# Obtener certificado
sudo certbot certonly --standalone -d tudominio.com

# Copiar certificados
sudo cp /etc/letsencrypt/live/tudominio.com/fullchain.pem nginx/ssl/server.crt
sudo cp /etc/letsencrypt/live/tudominio.com/privkey.pem nginx/ssl/server.key

# Reiniciar nginx
docker compose restart nginx
```

---

### 🔍 Comandos de Diagnóstico

**Ver estado de todos los servicios:**
```bash
docker compose ps
```

**Ver logs en tiempo real:**
```bash
docker compose logs -f
```

**Ver logs de un servicio específico:**
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f nginx
```

**Verificar conectividad de red:**
```bash
docker compose exec backend ping postgres
```

**Verificar variables de entorno:**
```bash
docker compose exec backend env | grep DATABASE_URL
```

**Acceder a la base de datos:**
```bash
docker compose exec postgres psql -U sysadmin -d sysadmin_db
```

---

### 🆘 Reinstalación Limpia

Si todo falla, puedes hacer una reinstalación limpia:

```bash
# 1. Detener y eliminar todo
docker compose down -v

# 2. Eliminar imágenes (opcional)
docker rmi ai_agent-backend ai_agent-frontend

# 3. Limpiar archivos de configuración
rm -f .env
rm -rf nginx/ssl/*

# 4. Ejecutar instalador nuevamente
./install.sh
```

⚠️ **ADVERTENCIA**: Esto eliminará todos los datos. Haz backup primero si es necesario.

---

### 📞 Soporte

Si ninguna de estas soluciones funciona:

1. Recopila logs:
   ```bash
   docker compose logs > logs.txt
   ```

2. Recopila información del sistema:
   ```bash
   docker version > system_info.txt
   docker compose version >> system_info.txt
   uname -a >> system_info.txt
   ```

3. Contacta al soporte con estos archivos.
