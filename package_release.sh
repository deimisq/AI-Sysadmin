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
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado.${NC} Por favor instálalo primero: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose no está instalado o es muy antiguo.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Requisitos cumplidos.${NC}"

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

HTTP_PORT=80
HTTPS_PORT=443
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
sudo docker compose up -d

echo -e "${YELLOW}⏳ Esperando a que la base de datos esté lista...${NC}"
sleep 10 # Espera inicial
# Loop de espera hasta que pg_isready responda
MAX_RETRIES=30
COUNT=0
while ! sudo docker compose exec postgres pg_isready -U "$DB_USER" > /dev/null 2>&1; do
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
sleep 5

# --- 6. Crear Superadmin ---
echo -e "\n${YELLOW}👤 Creando usuario Superadmin en la base de datos...${NC}"

# Escapar comillas para el comando python
SAFE_ADMIN_PASS=$(echo "$ADMIN_PASS" | sed "s/'/\\\'/g")

sudo docker compose exec backend python3 -c "
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
El sistema está corriendo en: ${BLUE}https://$DOMAIN${NC}

Credenciales de Acceso:
   Usuario:  ${YELLOW}$ADMIN_USER${NC}
   Password: ${YELLOW}(la que ingresaste)${NC}

📝 Notas:
1. Si usaste un dominio real, recuerda configurar los DNS.
2. Los certificados SSL son autofirmados. Acepta la advertencia en el navegador.
3. Para detener el sistema: sudo docker compose down
4. Para ver logs: sudo docker compose logs -f
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

echo -e "${GREEN}✅ Paquete creado exitosamente en la carpeta 'dist/'${NC}"
echo -e "Puedes comprimir esta carpeta y enviarla al cliente:"
echo -e "${YELLOW}tar -czf ai-sysadmin-release.tar.gz dist/${NC}"
