# 🚀 Guía de Despliegue

Esta guía describe cómo desplegar el **AI Sysadmin Agent** en un entorno de producción.

## 🏗️ Arquitectura de Despliegue

Para producción recomendamos:
-   **Docker Compose** para orquestar los servicios (Frontend, Backend, BD).
-   **Nginx** como proxy inverso (terminación SSL).
-   **Systemd** o políticas de reinicio de Docker para alta disponibilidad.

## 📋 Prerrequisitos

-   Un servidor Linux (se recomienda Ubuntu 22.04).
-   Dirección IP pública.
-   Nombre de dominio (opcional pero recomendado para SSL).
-   Docker y Docker Compose instalados.

## 🐳 Despliegue con Docker (Recomendado)

### 1. Preparar el Servidor

Clona el repositorio en tu servidor de producción:
```bash
git clone https://github.com/sentrait/ai_agent.git
cd ai_agent
```

### 2. Configurar Variables de Entorno

Crea el archivo `.env` de producción:
```bash
cp backend/.env.example backend/.env
```
Edita `backend/.env` con tus credenciales de **producción**:
-   Establece una `SECRET_KEY` fuerte.
-   Configura tu proveedor de IA (AWS Bedrock/OpenAI).
-   Ajusta `DATABASE_URL` para que apunte al servicio del contenedor de la base de datos (p. ej., `postgresql://user:pass@db:5432/dbname`).

Crea el archivo de entorno del frontend:
```bash
cp frontend/.env.local.example frontend/.env.local
```
Edita `frontend/.env.local`:
-   `NEXT_PUBLIC_API_URL`: Establece esto a tu dominio/IP público del endpoint API (p. ej., `https://api.tudominio.com/api/v1` o `http://TU_IP:8000/api/v1`).

### 3. Construir y Ejecutar con Docker Compose

Necesitamos crear un `docker-compose.prod.yml` de producción (o actualizar el existente). Aquí hay una configuración recomendada:

```yaml
version: '3.8'

services:
  db:
    image: ankane/pgvector:latest
    environment:
      POSTGRES_USER: sysadmin
      POSTGRES_PASSWORD: secure_production_password
      POSTGRES_DB: sysadmin_agent_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  backend:
    build: ./backend
    command: uvicorn main:app --host 0.0.0.0 --port 8000
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql://sysadmin:secure_production_password@db:5432/sysadmin_agent_db
    depends_on:
      - db
    restart: always
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    restart: always
    environment:
      - NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000/api/v1

volumes:
  postgres_data:
```

Ejecuta el despliegue:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Migraciones de Base de Datos

Una vez que los contenedores estén en ejecución, aplica las migraciones de la base de datos:

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## 🔒 Consideraciones de Seguridad para Producción

1.  **SSL/TLS**: NO expongas directamente los puertos 3000/8000 a Internet sin SSL. Usa Nginx con Let's Encrypt.
2.  **Cortafuegos**:
    -   Permite 80/443 (HTTP/HTTPS).
    -   Permite 22 (SSH) sólo desde IPs de confianza.
    -   Bloquea 5432 (base de datos) para acceso externo.
3.  **Secretos**: Nunca comites archivos `.env` al repositorio. Usa un gestor de secretos si es posible.
4.  **Claves SSH**: Asegúrate de que el contenedor del backend tenga acceso a las claves SSH necesarias para gestionar tu infraestructura. Puede que necesites montar un volumen con las claves:
    ```yaml
    volumes:
      - /ruta/en/el/host/keys:/root/.ssh:ro
    ```

## 🔄 Actualizar la Aplicación

Para actualizar a la última versión:

```bash
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## 📊 Monitorización

-   **Registros**: Visualiza logs con `docker compose logs -f`.
-   **Comprobaciones de salud**:
    -   Backend: `GET /health`
    -   Frontend: `GET /`
