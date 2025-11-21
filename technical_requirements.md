# Requerimientos Técnicos - AI Sysadmin Agent

Este documento detalla los requisitos de software, red y configuración necesarios para desplegar y probar el sistema "AI Sysadmin Agent".

## 1. Requisitos de Software (Servidor)

El servidor donde se despliegue el agente (Backend + Base de Datos) debe contar con:

- **Sistema Operativo**: Linux (Ubuntu 22.04/24.04 recomendado).
- **Docker Engine**: Versión 24.0+ (para contenedores).
- **Docker Compose**: Plugin V2 (para orquestación).
- **Python**: Versión 3.10 o superior (para scripts de mantenimiento).
- **Git**: Para clonar el repositorio.

### Para Desarrollo Frontend (Local o Servidor de Build)
- **Node.js**: Versión 18.17 o superior.
- **npm**: Incluido con Node.js.

## 2. Requisitos de Red (Firewall / Security Groups)

Para permitir el acceso y las pruebas online, se deben abrir los siguientes puertos en el firewall del servidor (AWS Security Groups, UFW, etc.):

| Puerto | Protocolo | Servicio | Descripción | Acceso Recomendado |
| :--- | :--- | :--- | :--- | :--- |
| **22** | TCP | SSH | Acceso administrativo al servidor. | Restringido a IPs de admins. |
| **8000** | TCP | Backend API | API REST del Agente (FastAPI). | Público (o restringido a Frontend/n8n). |
| **3000** | TCP | Frontend | Interfaz de Usuario (Next.js). | Público (Usuarios finales). |
| **5432** | TCP | PostgreSQL | Base de Datos. | **Privado** (localhost/Docker network). Solo abrir si se requiere acceso externo para debug. |

> [!IMPORTANT]
> Si se usa **n8n** en la nube, el puerto **8000** debe ser accesible desde las IPs de n8n para que los webhooks funcionen.

## 3. Variables de Entorno

El sistema requiere las siguientes variables de entorno configuradas (crear archivo `.env` en `backend/`):

```bash
# Base de Datos
POSTGRES_USER=sysadmin_agent
POSTGRES_PASSWORD=secure_password_dev
POSTGRES_DB=sysadmin_agent_db
DATABASE_URL=postgresql://sysadmin_agent:secure_password_dev@localhost:5432/sysadmin_agent_db

# OpenAI (Inteligencia del Agente)
OPENAI_API_KEY=sk-... (Tu llave de API)

# Seguridad (Opcional para MVP, crítico para Prod)
SECRET_KEY=super-secret-key-for-jwt
ALLOWED_ORIGINS=*
```

## 4. Arquitectura de Despliegue Sugerida

1.  **Backend + DB**: Corren en el servidor Linux vía Docker Compose.
2.  **Frontend**: Puede correr en el mismo servidor (vía `npm start` o Docker) o desplegarse en Vercel/Netlify apuntando a la IP del servidor Backend.
