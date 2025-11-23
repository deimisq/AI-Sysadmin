# 🚀 Deployment Guide

This guide describes how to deploy the **AI Sysadmin Agent** in a production environment.

## 🏗️ Deployment Architecture

For production, we recommend:
-   **Docker Compose** for orchestrating services (Frontend, Backend, DB).
-   **Nginx** as a reverse proxy (SSL termination).
-   **Systemd** or Docker Restart Policies for high availability.

## 📋 Prerequisites

-   A Linux server (Ubuntu 22.04 recommended).
-   Public IP address.
-   Domain name (optional but recommended for SSL).
-   Docker and Docker Compose installed.

## 🐳 Docker Deployment (Recommended)

### 1. Prepare the Server

Clone the repository to your production server:
```bash
git clone https://github.com/sentrait/ai_agent.git
cd ai_agent
```

### 2. Configure Environment Variables

Create the production `.env` file:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` with your **production** credentials:
-   Set a strong `SECRET_KEY`.
-   Configure your AI Provider (AWS Bedrock/OpenAI).
-   Set `DATABASE_URL` to point to the docker container service (e.g., `postgresql://user:pass@db:5432/dbname`).

Create the frontend environment file:
```bash
cp frontend/.env.local.example frontend/.env.local
```
Edit `frontend/.env.local`:
-   `NEXT_PUBLIC_API_URL`: Set this to your public domain/IP API endpoint (e.g., `https://api.yourdomain.com/api/v1` or `http://YOUR_IP:8000/api/v1`).

### 3. Build and Run with Docker Compose

We need to create a production `docker-compose.prod.yml` (or update the existing one). Here is a recommended configuration:

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

Run the deployment:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Database Migrations

Once the containers are running, apply the database migrations:

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## 🔒 Security Considerations for Production

1.  **SSL/TLS**: Do NOT expose ports 3000/8000 directly to the internet without SSL. Use Nginx with Let's Encrypt.
2.  **Firewall**:
    -   Allow 80/443 (HTTP/HTTPS).
    -   Allow 22 (SSH) only from trusted IPs.
    -   Block 5432 (Database) from external access.
3.  **Secrets**: Never commit `.env` files to Git. Use a secrets manager if possible.
4.  **SSH Keys**: Ensure the backend container has access to the SSH keys needed to manage your infrastructure. You may need to mount a volume with keys:
    ```yaml
    volumes:
      - /path/to/host/keys:/root/.ssh:ro
    ```

## 🔄 Updating the Application

To update to the latest version:

```bash
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## 📊 Monitoring

-   **Logs**: View logs with `docker compose logs -f`.
-   **Health Checks**:
    -   Backend: `GET /health`
    -   Frontend: `GET /`
