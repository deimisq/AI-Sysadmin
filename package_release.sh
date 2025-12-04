#!/bin/bash
set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📦 Iniciando proceso de empaquetado para distribución (Versión Interactiva)...${NC}"

# 1. Limpiar build anterior
rm -rf dist/
mkdir -p dist/images
mkdir -p dist/nginx/conf.d
mkdir -p dist/nginx/ssl

# 2. Construir imágenes
echo -e "${YELLOW}🔨 Construyendo imágenes Docker...${NC}"
# Aseguramos que se construyan con la configuración de producción
sudo docker compose -f docker-compose.prod.yml build

# 3. Guardar imágenes a archivos .tar
echo -e "${YELLOW}💾 Exportando imágenes a archivos .tar (esto puede tardar)...${NC}"
echo "   - Backend..."
sudo docker save ai_agent-backend:latest | gzip > dist/images/backend.tar.gz
echo "   - Frontend..."
sudo docker save ai_agent-frontend:latest | gzip > dist/images/frontend.tar.gz
echo "   - Nginx..."
sudo docker save nginx:alpine | gzip > dist/images/nginx.tar.gz
echo "   - Postgres..."
sudo docker save pgvector/pgvector:pg15 | gzip > dist/images/postgres.tar.gz

# 4. Copiar archivos de configuración necesarios
echo -e "${YELLOW}📂 Copiando archivos de configuración...${NC}"
cp docker-compose.release.yml dist/docker-compose.yml
cp nginx/conf.d/default.conf dist/nginx/conf.d/

# 5. Generar script de instalación interactivo (install.sh)
echo -e "${YELLOW}📝 Generando script de instalación interactivo (install.sh)...${NC}"
cat > dist/install.sh << 'EOF'
#!/bin/bash
set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}
================================================================
   🚀 INSTALADOR INTERACTIVO - AI SYSADMIN AGENT
================================================================
${NC}"

# --- 1. Verificaciones Previas ---
echo -e "${YELLOW}🔍 Verificando requisitos...${NC}"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado.${NC}"
    echo "Por favor instálalo primero:"
    echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com | sh"
    echo "  Documentación: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar Docker Compose (v1 o v2)
DOCKER_COMPOSE=""
if docker compose version &> /dev/null; then
    # Docker Compose v2 (integrado en Docker)
    DOCKER_COMPOSE="docker compose"
    echo -e "${GREEN}✅ Docker Compose v2 detectado${NC}"
elif command -v docker-compose &> /dev/null; then
    # Docker Compose v1 (standalone)
    DOCKER_COMPOSE="docker-compose"
    echo -e "${GREEN}✅ Docker Compose v1 detectado${NC}"
else
    echo -e "${RED}❌ Docker Compose no está instalado.${NC}"
    echo "Por favor instálalo:"
    echo "  Para Docker Compose v2 (recomendado):"
    echo "    sudo apt-get update && sudo apt-get install docker-compose-plugin"
    echo "  Para Docker Compose v1:"
    echo "    sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "    sudo chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

echo -e "${GREEN}✅ Requisitos cumplidos.${NC}"

# Verificar puertos disponibles
echo -e "\n${YELLOW}🔍 Verificando puertos...${NC}"
PORT_80_IN_USE=false
PORT_443_IN_USE=false

if sudo lsof -i :80 > /dev/null 2>&1 || sudo netstat -tuln | grep ':80 ' > /dev/null 2>&1; then
    PORT_80_IN_USE=true
    echo -e "${YELLOW}⚠️  Puerto 80 está en uso${NC}"
    sudo lsof -i :80 2>/dev/null || sudo netstat -tulpn | grep ':80 '
fi

if sudo lsof -i :443 > /dev/null 2>&1 || sudo netstat -tuln | grep ':443 ' > /dev/null 2>&1; then
    PORT_443_IN_USE=true
    echo -e "${YELLOW}⚠️  Puerto 443 está en uso${NC}"
    sudo lsof -i :443 2>/dev/null || sudo netstat -tulpn | grep ':443 '
fi

# Si hay conflictos, ofrecer soluciones
if [ "$PORT_80_IN_USE" = true ] || [ "$PORT_443_IN_USE" = true ]; then
    echo -e "\n${YELLOW}Los puertos 80 y/o 443 están en uso. Opciones:${NC}"
    echo "1) Detener servicios conflictivos automáticamente (Apache/Nginx)"
    echo "2) Usar puertos alternativos (8080/8443)"
    echo "3) Salir y resolver manualmente"
    read -p "Selecciona una opción [1-3]: " PORT_OPTION
    
    case $PORT_OPTION in
        1)
            echo -e "${YELLOW}Deteniendo servicios conflictivos...${NC}"
            sudo systemctl stop apache2 2>/dev/null || true
            sudo systemctl stop nginx 2>/dev/null || true
            sudo systemctl stop httpd 2>/dev/null || true
            echo -e "${GREEN}✅ Servicios detenidos${NC}"
            HTTP_PORT=80
            HTTPS_PORT=443
            ;;
        2)
            echo -e "${YELLOW}Usando puertos alternativos...${NC}"
            HTTP_PORT=8080
            HTTPS_PORT=8443
            echo -e "${GREEN}✅ Se usarán puertos $HTTP_PORT y $HTTPS_PORT${NC}"
            ;;
        3)
            echo -e "${RED}Instalación cancelada.${NC}"
            echo "Para liberar los puertos manualmente:"
            echo "  sudo systemctl stop apache2"
            echo "  sudo systemctl stop nginx"
            exit 0
            ;;
        *)
            echo -e "${RED}Opción inválida. Saliendo.${NC}"
            exit 1
            ;;
    esac
else
    HTTP_PORT=80
    HTTPS_PORT=443
    echo -e "${GREEN}✅ Puertos 80 y 443 disponibles${NC}"
fi

# --- 2. Recolección de Datos ---
echo -e "\n${BLUE}📝 Configuración del Sistema${NC}"
echo "Por favor, ingresa los datos solicitados para configurar el sistema."

# Dominio
read -p "🌐 Dominio o IP del servidor (ej. midominio.com o 192.168.1.10) [localhost]: " DOMAIN
DOMAIN=${DOMAIN:-localhost}

# Protocolo (para ALLOWED_ORIGINS)
PROTOCOL="https"
if [[ "$DOMAIN" == "localhost" || "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    # Si es IP o localhost, asumimos que usará certificados autofirmados
    echo -e "${YELLOW}⚠️  Usando certificados autofirmados para $DOMAIN${NC}"
else
    echo -e "${YELLOW}ℹ️  Se configurará para $DOMAIN. Recuerda configurar tus certificados SSL reales en nginx/ssl/ después.${NC}"
fi

ALLOWED_ORIGINS="$PROTOCOL://$DOMAIN"
if [ "$DOMAIN" != "localhost" ]; then
    ALLOWED_ORIGINS="$ALLOWED_ORIGINS,https://localhost,http://localhost"
fi

# Base de Datos
echo -e "\n${BLUE}🗄️  Configuración de Base de Datos${NC}"
read -p "Usuario de BD [sysadmin]: " DB_USER
DB_USER=${DB_USER:-sysadmin}

# Generar contraseña segura por defecto
DEFAULT_DB_PASS=$(openssl rand -base64 12)
read -s -p "Contraseña de BD (Enter para generar una segura): " DB_PASS
echo ""
DB_PASS=${DB_PASS:-$DEFAULT_DB_PASS}
echo -e "${GREEN}✅ Contraseña configurada.${NC}"

# IA
echo -e "\n${BLUE}🤖 Configuración de IA (Gemini)${NC}"
read -s -p "Gemini API Key (Enter para dejar vacío/configurar luego): " GEMINI_KEY
echo ""
GEMINI_KEY=${GEMINI_KEY:-YOUR_GEMINI_API_KEY_HERE}

# SMTP (Opcional)
echo -e "\n${BLUE}📧 Configuración de Correo (Opcional)${NC}"
read -p "¿Deseas configurar SMTP ahora? (s/N): " CONFIGURE_SMTP
if [[ "$CONFIGURE_SMTP" =~ ^[sS]$ ]]; then
    read -p "Servidor SMTP (ej. smtp.gmail.com): " SMTP_SERVER
    read -p "Puerto SMTP [587]: " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-587}
    read -p "Usuario SMTP: " SMTP_USER
    read -s -p "Contraseña SMTP: " SMTP_PASS
    echo ""
    read -p "Email Remitente (From): " SMTP_FROM
else
    SMTP_SERVER=""
    SMTP_PORT="587"
    SMTP_USER=""
    SMTP_PASS=""
    SMTP_FROM=""
fi

# Superadmin
echo -e "\n${BLUE}👤 Creación del Usuario Superadmin${NC}"
read -p "Username [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}
read -p "Email: " ADMIN_EMAIL
read -p "Nombre Completo: " ADMIN_NAME
read -s -p "Contraseña: " ADMIN_PASS
echo ""

# --- 3. Generación de Archivos ---
echo -e "\n${YELLOW}⚙️  Generando archivos de configuración...${NC}"

# Generar claves de seguridad
SECRET_KEY=$(openssl rand -hex 32)
# Intentar generar clave Fernet con python, sino usar fallback
if command -v python3 &> /dev/null; then
    ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null)
else
    # Fallback simple si no hay python en el host (poco probable pero posible)
    ENCRYPTION_KEY=$(openssl rand -base64 32)=
fi

# Crear .env
cat > .env << ENVEOF
# Generado por install.sh
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASS
POSTGRES_DB=sysadmin_db

SECRET_KEY=$SECRET_KEY
ENCRYPTION_KEY=$ENCRYPTION_KEY

GEMINI_API_KEY=$GEMINI_KEY

SMTP_SERVER=$SMTP_SERVER
SMTP_PORT=$SMTP_PORT
SMTP_USERNAME=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASS
SMTP_FROM_EMAIL=$SMTP_FROM

ALLOWED_ORIGINS=$ALLOWED_ORIGINS

HTTP_PORT=$HTTP_PORT
HTTPS_PORT=$HTTPS_PORT
NEXT_PUBLIC_API_URL=/api/v1
ENVEOF

echo -e "${GREEN}✅ Archivo .env creado.${NC}"

# Generar SSL autofirmado si no existe
if [ ! -f nginx/ssl/server.key ]; then
    echo -e "${YELLOW}🔒 Generando certificados SSL autofirmados...${NC}"
    mkdir -p nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/server.key \
        -out nginx/ssl/server.crt \
        -subj "/C=UY/ST=Montevideo/L=Montevideo/O=AI Agent/OU=IT/CN=$DOMAIN" 2>/dev/null
    echo -e "${GREEN}✅ Certificados generados.${NC}"
fi

# --- 4. Carga de Imágenes ---
echo -e "\n${YELLOW}📦 Cargando imágenes Docker (esto puede tomar un momento)...${NC}"
for img in images/*.tar.gz; do
    if [ -f "$img" ]; then
        echo "   - Cargando $img..."
        docker load < "$img" > /dev/null
    fi
done

# --- 5. Inicio del Sistema ---
echo -e "\n${YELLOW}🚀 Iniciando servicios...${NC}"

# Limpiar contenedores existentes si los hay (evita errores de ContainerConfig)
if $DOCKER_COMPOSE ps -q 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}⚠️  Detectados contenedores existentes. Limpiando...${NC}"
    $DOCKER_COMPOSE down -v 2>/dev/null || true
    echo -e "${GREEN}✅ Limpieza completada${NC}"
fi

$DOCKER_COMPOSE up -d

echo -e "${YELLOW}⏳ Esperando a que la base de datos esté lista...${NC}"
sleep 10 # Espera inicial
# Loop de espera hasta que pg_isready responda
MAX_RETRIES=30
COUNT=0
while ! $DOCKER_COMPOSE exec postgres pg_isready -U "$DB_USER" > /dev/null 2>&1; do
    sleep 2
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo -e "${RED}❌ Tiempo de espera agotado para la base de datos.${NC}"
        exit 1
    fi
    echo -n "."
done
echo -e "\n${GREEN}✅ Base de datos lista.${NC}"

echo -e "${YELLOW}⏳ Esperando a que el backend inicie y aplique migraciones...${NC}"
# Esperar a que el backend esté listo y las migraciones se hayan aplicado
MAX_RETRIES=60
COUNT=0
MIGRATIONS_READY=false

while [ $COUNT -lt $MAX_RETRIES ]; do
    # 1. Verificar si el contenedor backend sigue corriendo
    if ! $DOCKER_COMPOSE ps backend | grep -q "Up"; then
        echo -e "\n${RED}❌ El contenedor del backend se ha detenido o está reiniciándose.${NC}"
        echo "Logs de error:"
        $DOCKER_COMPOSE logs --tail=20 backend
        exit 1
    fi

    # 2. Verificar si la tabla existe (simplificado para evitar bloqueos)
    # Usamos un archivo temporal para capturar la salida y evitar problemas con pipes
    $DOCKER_COMPOSE exec -T postgres psql -U "$DB_USER" -d sysadmin_db -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'allowed_domains');" > /tmp/migration_check.txt 2>/dev/null
    
    if grep -q 't' /tmp/migration_check.txt; then
        MIGRATIONS_READY=true
        rm -f /tmp/migration_check.txt
        break
    fi
    rm -f /tmp/migration_check.txt

    # 3. Feedback visual
    sleep 2
    COUNT=$((COUNT+1))
    echo -n "."

    # Cada 5 intentos (10s), mostrar estado
    if [ $((COUNT % 5)) -eq 0 ]; then
        echo -n "⏳"
    fi
done

if [ "$MIGRATIONS_READY" = false ]; then
    echo -e "\n${RED}❌ Las migraciones de base de datos no se completaron a tiempo.${NC}"
    echo "Verifica los logs del backend:"
    echo "  $DOCKER_COMPOSE logs backend"
    exit 1
fi

echo -e "\n${GREEN}✅ Migraciones aplicadas correctamente.${NC}"

# --- 6. Crear Superadmin ---
echo -e "\n${YELLOW}👤 Creando usuario Superadmin en la base de datos...${NC}"

# Escapar comillas para el comando python
SAFE_ADMIN_PASS=$(echo "$ADMIN_PASS" | sed "s/'/\\\'/g")

sudo $DOCKER_COMPOSE exec backend python3 -c "
import sys
from database import SessionLocal
from models import User, RoleType, AllowedDomain
from utils.auth import get_password_hash

try:
    db = SessionLocal()
    
    # 1. Crear Dominio Permitido (basado en el email del admin)
    email_domain = '$ADMIN_EMAIL'.split('@')[1]
    existing_domain = db.query(AllowedDomain).filter(AllowedDomain.domain == email_domain).first()
    if not existing_domain:
        print(f'   - Agregando dominio permitido: {email_domain}')
        db.add(AllowedDomain(domain=email_domain, description='Dominio del Administrador', is_active=True))
        db.commit()
    
    # 2. Crear Usuario
    existing_user = db.query(User).filter(User.username == '$ADMIN_USER').first()
    if existing_user:
        print('   - El usuario ya existe, actualizando contraseña y rol...')
        existing_user.hashed_password = get_password_hash('$SAFE_ADMIN_PASS')
        existing_user.role = RoleType.SUPERADMIN.value
        existing_user.is_active = True
        db.commit()
    else:
        print('   - Creando nuevo superadmin...')
        admin = User(
            username='$ADMIN_USER',
            email='$ADMIN_EMAIL',
            full_name='$ADMIN_NAME',
            hashed_password=get_password_hash('$SAFE_ADMIN_PASS'),
            is_active=True,
            role=RoleType.SUPERADMIN.value
        )
        db.add(admin)
        db.commit()
    print('   ✅ Usuario configurado exitosamente.')
except Exception as e:
    print(f'   ❌ Error creando usuario: {e}')
    sys.exit(1)
"

echo -e "\n${GREEN}
================================================================
   🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE
================================================================
${NC}
El sistema está corriendo en: ${BLUE}https://$DOMAIN:$HTTPS_PORT${NC}

Credenciales de Acceso:
   Usuario:  ${YELLOW}$ADMIN_USER${NC}
   Password: ${YELLOW}(la que ingresaste)${NC}

📝 Notas:
1. Si usaste un dominio real, recuerda configurar los DNS.
2. Los certificados SSL son autofirmados. Acepta la advertencia en el navegador.
3. Puertos en uso: HTTP=$HTTP_PORT, HTTPS=$HTTPS_PORT
4. Para detener el sistema: $DOCKER_COMPOSE down
5. Para ver logs: $DOCKER_COMPOSE logs -f
"
EOF

chmod +x dist/install.sh

# 6. Crear README para el cliente
cat > dist/README.txt << 'EOF'
AI Sysadmin Agent - Paquete de Distribución
===========================================

Instrucciones de Instalación:
-----------------------------
1. Copie esta carpeta al servidor destino.
2. Asegúrese de tener Docker y Docker Compose instalados.
3. Ejecute el instalador interactivo:
   
   ./install.sh

   El instalador le guiará paso a paso para:
   - Configurar el dominio
   - Configurar la base de datos
   - Crear el usuario administrador
   - Iniciar el sistema automáticamente

--------------------------------------------------------------------------------

📘 ACTUALIZACIÓN DEL SISTEMA

Para actualizar una instalación existente a la última versión:

1. Navegue al directorio donde instaló el sistema:
   cd /opt/dist  (o donde haya instalado)

2. Ejecute el script de actualización:
   ./update.sh

El script automáticamente:
- Creará un backup de la base de datos
- Descargará la última versión
- Actualizará las imágenes Docker
- Reiniciará los servicios
- Aplicará las nuevas migraciones

NOTA: Su archivo .env (configuración) NO será modificado.

--------------------------------------------------------------------------------

📘 GUÍA DE OPERACIÓN Y MANTENIMIENTO

1. Verificar el estado del sistema
   Para ver si todos los servicios están corriendo correctamente:
   
   sudo docker compose ps

   Debería ver 4 servicios (backend, frontend, postgres, nginx) con estado "Up" o "Healthy".

2. Ver Logs (Bitácora de errores)
   Si algo falla, lo primero es revisar los logs.
   
   - Ver logs de todo el sistema en tiempo real:
     sudo docker compose logs -f

   - Ver logs de un servicio específico (ej. backend):
     sudo docker compose logs -f backend

   - Ver las últimas 100 líneas de logs del backend:
     sudo docker compose logs --tail=100 backend

3. Reiniciar el sistema
   Si necesita reiniciar todos los servicios:
   
   sudo docker compose restart

   Para reiniciar solo un servicio específico:
   sudo docker compose restart backend

4. Detener el sistema
   Para detener todos los servicios:
   
   sudo docker compose stop

   Para detener y eliminar los contenedores (los datos de la BD se mantienen):
   sudo docker compose down

5. Copias de Seguridad (Backup)
   Para respaldar la base de datos:
   
   sudo docker compose exec postgres pg_dump -U sysadmin sysadmin_db > backup_$(date +%Y%m%d).sql

   Para restaurar un backup (¡Cuidado! Borra datos actuales):
   cat backup_file.sql | sudo docker compose exec -T postgres psql -U sysadmin sysadmin_db

6. Actualización de Certificados SSL
   Si usa certificados propios, reemplace los archivos en:
   - dist/nginx/ssl/server.crt
   - dist/nginx/ssl/server.key
   
   Y luego reinicie nginx:
   sudo docker compose restart nginx

--------------------------------------------------------------------------------

Soporte:
Si encuentra errores persistentes, por favor envíe los logs del backend (paso 2) al equipo de soporte.
EOF

# 7. Generar script de actualización (update.sh)
echo -e "${YELLOW}📝 Generando script de actualización (update.sh)...${NC}"
cat > dist/update.sh << 'EOF'
#!/bin/bash
set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}
================================================================
   🔄 ACTUALIZADOR - AI SYSADMIN AGENT
================================================================
${NC}"

# Detectar Docker Compose
DOCKER_COMPOSE=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}❌ Docker Compose no está instalado.${NC}"
    exit 1
fi

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ No se encontró docker-compose.yml${NC}"
    echo "Asegúrate de ejecutar este script desde el directorio de instalación."
    exit 1
fi

# Verificar que los servicios están corriendo
if ! $DOCKER_COMPOSE ps | grep -q "Up"; then
    echo -e "${RED}❌ Los servicios no están corriendo.${NC}"
    echo "Este script es para actualizar una instalación existente."
    exit 1
fi

echo -e "${YELLOW}⚠️  IMPORTANTE: Este script actualizará tu instalación.${NC}"
echo "Se realizará un backup automático de la base de datos."
echo ""
read -p "¿Deseas continuar? (s/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
    echo "Actualización cancelada."
    exit 0
fi

# --- 1. Backup de Base de Datos ---
echo -e "\n${YELLOW}📦 Creando backup de la base de datos...${NC}"
BACKUP_FILE="backup_pre_update_$(date +%Y%m%d_%H%M%S).sql"
$DOCKER_COMPOSE exec -T postgres pg_dump -U sysadmin sysadmin_db > "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup creado: $BACKUP_FILE${NC}"

# --- 2. Descargar nuevo paquete ---
echo -e "\n${YELLOW}📥 Descargando nueva versión...${NC}"
DOWNLOAD_URL="https://agent.sentrait.com.uy/ai-sysadmin-release.tar.gz"
curl -L -o new_release.tar.gz "$DOWNLOAD_URL"
echo -e "${GREEN}✅ Descarga completada.${NC}"

# --- 3. Extraer nuevo paquete ---
echo -e "\n${YELLOW}📂 Extrayendo archivos...${NC}"
mkdir -p new_release
tar -xzf new_release.tar.gz -C new_release --strip-components=1
echo -e "${GREEN}✅ Archivos extraídos.${NC}"

# --- 4. Cargar nuevas imágenes ---
echo -e "\n${YELLOW}🐳 Cargando nuevas imágenes Docker...${NC}"
for img in new_release/images/*.tar.gz; do
    if [ -f "$img" ]; then
        echo "   - Cargando $(basename $img)..."
        docker load < "$img" > /dev/null
    fi
done
echo -e "${GREEN}✅ Imágenes cargadas.${NC}"

# --- 5. Actualizar archivos de configuración (sin sobreescribir .env) ---
echo -e "\n${YELLOW}📋 Actualizando archivos de configuración...${NC}"
cp new_release/docker-compose.yml docker-compose.yml
cp -r new_release/nginx/conf.d/* nginx/conf.d/ 2>/dev/null || true
echo -e "${GREEN}✅ Configuración actualizada (tu .env se mantiene intacto).${NC}"

# --- 6. Reiniciar servicios ---
echo -e "\n${YELLOW}🔄 Reiniciando servicios...${NC}"
$DOCKER_COMPOSE down
$DOCKER_COMPOSE up -d

# Esperar a que los servicios estén listos
echo -e "${YELLOW}⏳ Esperando a que los servicios inicien...${NC}"
sleep 10
MAX_RETRIES=30
COUNT=0
while ! $DOCKER_COMPOSE exec -T postgres pg_isready -U sysadmin > /dev/null 2>&1; do
    sleep 2
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo -e "${RED}❌ Timeout esperando la base de datos.${NC}"
        exit 1
    fi
    echo -n "."
done
echo -e "\n${GREEN}✅ Servicios iniciados.${NC}"

# --- 7. Aplicar nuevas migraciones (si las hay) ---
echo -e "\n${YELLOW}🔧 Aplicando migraciones de base de datos...${NC}"
$DOCKER_COMPOSE exec -T backend alembic upgrade head 2>/dev/null || echo "   (No hay migraciones nuevas o ya están aplicadas)"
echo -e "${GREEN}✅ Migraciones completadas.${NC}"

# --- 8. Limpieza ---
echo -e "\n${YELLOW}🧹 Limpiando archivos temporales...${NC}"
rm -rf new_release new_release.tar.gz
echo -e "${GREEN}✅ Limpieza completada.${NC}"

echo -e "\n${GREEN}
================================================================
   🎉 ACTUALIZACIÓN COMPLETADA EXITOSAMENTE
================================================================
${NC}
Tu sistema ha sido actualizado a la última versión.

${YELLOW}Backup guardado en:${NC} $BACKUP_FILE

${YELLOW}Comandos útiles:${NC}
- Ver logs: $DOCKER_COMPOSE logs -f
- Ver estado: $DOCKER_COMPOSE ps

Si encuentras problemas, puedes restaurar el backup:
1. $DOCKER_COMPOSE down
2. $DOCKER_COMPOSE up -d postgres
3. sleep 10
4. cat $BACKUP_FILE | $DOCKER_COMPOSE exec -T postgres psql -U sysadmin sysadmin_db
5. $DOCKER_COMPOSE up -d
"
EOF

chmod +x dist/update.sh

echo -e "${GREEN}✅ Paquete creado exitosamente en la carpeta 'dist/'${NC}"
echo -e "Puedes comprimir esta carpeta y enviarla al cliente:"
echo -e "${YELLOW}tar -czf ai-sysadmin-release.tar.gz dist/${NC}"
