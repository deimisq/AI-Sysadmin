# 🤖 AI Sysadmin Agent

> **Agente de IA conversacional para diagnóstico y resolución de problemas de infraestructura con soporte multilingüe y panel de administración completo**

Un sistema inteligente que diagnostica problemas de servidores Linux, propone soluciones basadas en datos reales y ejecuta comandos de forma segura con supervisión humana. Incluye un panel de administración completo para gestión de usuarios, servidores, configuración del sistema y más.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

## ✨ Características Principales

### 🧠 IA Conversacional Inteligente
- **Chat multi-turno**: Conversaciones naturales con el agente de IA
- **Análisis basado en datos reales**: Recopila métricas del servidor antes de diagnosticar
- **Verificación de problemas**: Detecta si el problema realmente existe o ya está resuelto
- **Explicaciones detalladas**: No solo ejecuta comandos, explica su razonamiento
- **Múltiples proveedores de IA**: Amazon Bedrock (Claude 3.5 Sonnet), Google Gemini 2.0 Flash, OpenAI GPT-4o

### 🌍 Soporte Multilingüe
- **Inglés y Español**: Interfaz completamente traducida
- **IA bilingüe**: Responde en el idioma seleccionado por el usuario
- **Persistencia de preferencias**: Guarda el idioma elegido automáticamente

### 👥 Panel de Administración Completo
- **Gestión de Usuarios**: CRUD completo con roles y permisos
  - Roles: Superadmin, Admin, Group Admin, User
  - **Roles por Grupo**: Asignación granular de roles (User/Group Admin) por grupo
  - Asignación de grupos y permisos granulares
  - Activación/desactivación de cuentas
- **Gestión de Servidores**: Administración centralizada de infraestructura
  - Organización por grupos
  - Credenciales SSH encriptadas
  - Asignación de permisos por grupo
- **Logs de Auditoría**: Seguimiento completo de acciones
  - Búsqueda y filtrado
  - Paginación
  - Agrupación por fecha
- **Configuración Dinámica**:
  - Parámetros de IA (proveedor, API keys, temperatura, tokens)
  - Configuración de Backend (base de datos, seguridad, CORS)
  - Configuración de Frontend (tema, idioma, paginación)
  - Comunicaciones (SMTP, notificaciones por email)
- **Seguridad Avanzada**:
  - Lista blanca de dominios para registro
  - Flujo de aprobación para nuevos usuarios
  - Notificaciones para superadmins
  - **Preferencias de Notificación**: Configuración personalizada de alertas por email
- **Estadísticas del Sistema**: Dashboard con métricas en tiempo real

### 🔍 Diagnóstico Avanzado
- **Recopilación automática de diagnósticos**: CPU, memoria, procesos, logs, disco
- **RAG (Retrieval-Augmented Generation)**: Aprende de casos anteriores
- **Base de conocimientos vectorial**: PostgreSQL + pgvector para búsqueda semántica

### 🛡️ Ejecución Segura
- **Aprobación humana requerida**: Todos los comandos requieren confirmación
- **Integración con Ansible**: Ejecución estructurada y auditable
- **Logs de operaciones**: Historial completo de todas las acciones
- **Filtrado por permisos**: Los usuarios solo ven servidores de sus grupos asignados

### 📧 Sistema de Notificaciones
- **SMTP configurable**: Envío de emails con configuración dinámica
- **Test de emails**: Verificación de configuración SMTP
- **Notificaciones automáticas**: Alertas para nuevos registros y eventos del sistema

### 🎨 Interfaz Moderna
- **Next.js 14** con React Server Components
- **Diseño responsive** con Tailwind CSS
- **Componentes UI** de shadcn/ui
- **Markdown rendering** para respuestas formateadas
- **Tema claro/oscuro** configurable

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  Next.js 14 + React + Tailwind CSS + shadcn/ui              │
│  - Interfaz de chat conversacional                          │
│  - Panel de administración completo                         │
│  - Gestión de servidores y usuarios                         │
│  - Selector de idioma (EN/ES)                               │
│  - Configuración dinámica del sistema                       │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/REST API
┌──────────────────▼──────────────────────────────────────────┐
│                         Backend                             │
│  FastAPI + Python 3.10+                                     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  AI Service (LangChain)                            │     │
│  │  - Amazon Bedrock (Claude 3.5 Sonnet)              │     │
│  │  - Google Gemini 2.0 Flash                         │     │
│  │  - OpenAI GPT-4o                                   │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Diagnostic Service                                │     │
│  │  - SSH connection (asyncssh)                       │     │
│  │  - System metrics collection                       │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Ansible Service                                   │     │
│  │  - Command execution                               │     │
│  │  - Playbook running                                │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Email Service                                     │     │
│  │  - SMTP email sending                              │     │
│  │  - Test email functionality                        │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Admin Services                                    │     │
│  │  - User management & RBAC                          │     │
│  │  - Server management                               │     │
│  │  - Audit logging                                   │     │
│  │  - Dynamic configuration                           │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    PostgreSQL + pgvector                    │
│  - Usuarios, roles y permisos                               │
│  - Servidores y credenciales (encriptadas)                  │
│  - Grupos de servidores                                     │
│  - Base de conocimientos con embeddings                     │
│  - Logs de operaciones y auditoría                          │
│  - Configuración dinámica del sistema                       │
│  - Dominios permitidos y notificaciones                     │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Inicio Rápido

### Prerrequisitos

-   **Docker Engine** y **Docker Compose**
-   **Git**

### 1. Clonar el Repositorio

```bash
git clone https://github.com/sentrait/ai_agent.git
cd ai_agent
```

### 2. Configurar Variables de Entorno

```bash
# Backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales (AWS/OpenAI, DB, etc.)

# Frontend
cp frontend/.env.local.example frontend/.env.local
# Editar frontend/.env.local (normalmente no requiere cambios para local)
```

### 3. Iniciar con Docker Compose

```bash
# Levantar todo el stack (Frontend, Backend, DB, Nginx)
sudo docker compose up --build -d
```

### 4. Ejecutar Migraciones de Base de Datos

```bash
# Ejecutar migraciones dentro del contenedor backend
sudo docker compose exec backend alembic upgrade head
```

### 5. Crear Usuario Superadmin

```bash
# Crear el primer usuario administrador
sudo docker compose exec backend python create_superuser.py
```

### 6. Acceder a la Aplicación

-   **Frontend**: http://localhost (o tu dominio configurado)
-   **Backend API**: http://localhost/api/v1
-   **Documentación API**: http://localhost/api/v1/docs
-   **Panel Admin**: http://localhost/admin (requiere login como admin)

## ⚙️ Configuración

### Variables de Entorno del Backend (`backend/.env`)

```env
# Database
DATABASE_URL=postgresql://sysadmin_agent:secure_password_dev@db:5432/sysadmin_agent_db

# Security
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Encryption (for SSH credentials)
ENCRYPTION_KEY=your-encryption-key-here-32-bytes

# AI Provider (choose one or configure all)
LLM_PROVIDER=bedrock  # Options: bedrock, gemini, openai

# Amazon Bedrock (recommended)
AWS_BEARER_TOKEN_BEDROCK=your-bedrock-api-key
AWS_REGION=us-east-1

# Google Gemini (alternative)
GOOGLE_API_KEY=your-gemini-api-key

# OpenAI (alternative)
OPENAI_API_KEY=your-openai-api-key
```

### Configuración Dinámica desde el Panel Admin

Una vez iniciada la aplicación, puedes configurar dinámicamente desde el panel de administración:

1. **AI Configuration** (`/admin` → AI Configuration):
   - Proveedor de LLM (Bedrock, Gemini, OpenAI)
   - API Keys
   - Parámetros del modelo (temperatura, max tokens)

2. **Backend Configuration** (`/admin` → Backend Configuration):
   - URL de base de datos
   - Configuración de seguridad (JWT, tokens)
   - CORS
   - Nivel de logs

3. **Frontend Configuration** (`/admin` → Frontend Configuration):
   - URL de la API
   - Nombre de la aplicación
   - Idioma por defecto
   - Tema (claro/oscuro/sistema)

4. **Communication Settings** (`/admin` → Communication):
   - Configuración SMTP
   - Notificaciones por email
   - Test de envío de emails

5. **Security Settings** (`/admin` → Security):
   - Dominios permitidos para registro
   - Políticas de aprobación de usuarios

## 📖 Guía de Uso

### Panel de Administración

#### 1. Gestión de Usuarios

1. Ve a **Admin Panel** → **Users**
2. Funcionalidades disponibles:
   - **Crear usuario**: Asigna rol, email, username
   - **Editar usuario**: Cambiar rol, activar/desactivar
   - **Asignar grupos**: Dar acceso a grupos específicos de servidores
   - **Eliminar usuario**: Remover acceso completamente

**Roles disponibles:**
- **Superadmin**: Acceso completo al sistema
- **Admin**: Gestión de usuarios y configuración
- **Group Admin**: Administración de grupos específicos
- **User**: Acceso básico a servidores asignados

#### 2. Gestión de Servidores

1. Ve a **Admin Panel** → **Servers**
2. Funcionalidades:
   - **Agregar servidor**: Hostname, IP, credenciales SSH
   - **Organizar en grupos**: Asignar servidores a grupos
   - **Editar configuración**: Actualizar credenciales o datos
   - **Eliminar servidor**: Remover de la infraestructura

#### 3. Configuración del Sistema

1. Ve a **Admin Panel** → Pestaña correspondiente
2. Configura los parámetros necesarios
3. Haz clic en **Save Configuration**
4. Los cambios se aplican inmediatamente (sin reiniciar)

#### 4. Logs de Auditoría

1. Ve a **Admin Panel** → **Logs**
2. Funcionalidades:
   - **Buscar**: Filtra por usuario, acción o recurso
   - **Paginar**: Navega por el historial
   - **Ver detalles**: Expande para ver información completa

### Uso del Agente de IA

#### 1. Agregar un Servidor

1. Haz clic en **"Add Server"** / **"Agregar Servidor"**
2. Completa la información:
   - Hostname
   - IP Address
   - SSH Username
   - SSH Password o SSH Private Key Path
   - Grupo (opcional)
3. Haz clic en **"Add Server"**

#### 2. Diagnosticar un Problema

1. Selecciona un servidor de la lista (solo verás servidores de tus grupos asignados)
2. Haz clic en **"Diagnose"** / **"Diagnosticar"**
3. Describe el problema en lenguaje natural:
   - "El servidor tiene alto consumo de CPU"
   - "The server is running out of disk space"
4. El agente:
   - Recopilará datos diagnósticos automáticamente
   - Analizará la situación
   - Te dirá si el problema existe o no
   - Propondrá soluciones si es necesario

#### 3. Ejecutar Comandos

1. Revisa el comando propuesto por la IA
2. Haz clic en **"Execute Command"** / **"Ejecutar Comando"**
3. El sistema ejecutará el comando y mostrará los resultados
4. La IA analizará automáticamente los resultados y continuará la conversación

#### 4. Cambiar Idioma

1. Haz clic en el icono de globo 🌐 en la esquina superior derecha
2. Selecciona **English** o **Español**
3. La interfaz y las respuestas de la IA cambiarán inmediatamente

### Registro de Nuevos Usuarios

1. Los usuarios pueden auto-registrarse desde `/register`
2. Si el dominio del email está en la lista blanca:
   - El usuario se activa automáticamente
3. Si el dominio NO está permitido:
   - El usuario queda pendiente de aprobación
   - Los superadmins reciben una notificación
   - Un admin debe activar manualmente la cuenta

## 🛠️ Stack Tecnológico Completo

### Backend
- **Framework**: FastAPI 0.104+
- **Language**: Python 3.10+
- **AI/ML**:
  - LangChain 0.1+
  - Amazon Bedrock (Claude 3.5 Sonnet)
  - Google Gemini 2.0 Flash
  - OpenAI GPT-4o
- **Database**: PostgreSQL 14+ con pgvector
- **ORM**: SQLAlchemy 2.0+
- **Migrations**: Alembic
- **SSH**: asyncssh, paramiko
- **Automation**: Ansible, ansible-runner
- **Security**: cryptography (para encriptación de credenciales)
- **Email**: smtplib (SMTP nativo de Python)

### Frontend
- **Framework**: Next.js 14.2+
- **Language**: TypeScript 5+
- **UI Library**: React 18
- **Styling**: Tailwind CSS 3.4+
- **Components**: shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **Markdown**: react-markdown
- **i18n**: Custom React Context

### Base de Datos
- **PostgreSQL 14+**
- **Extensiones**:
  - pgvector (para embeddings)

### DevOps
- **Containerization**: Docker, Docker Compose
- **Reverse Proxy**: Nginx
- **Version Control**: Git

## 📁 Estructura del Proyecto

```
ai_agent/
├── backend/
│   ├── alembic/              # Migraciones de base de datos
│   ├── routers/              # Endpoints de la API
│   │   ├── agent.py          # Endpoints del agente IA
│   │   ├── inventory.py      # Gestión de servidores
│   │   ├── admin.py          # Panel de administración
│   │   ├── auth.py           # Autenticación y registro
│   │   └── config.py         # Configuración dinámica
│   ├── services/             # Lógica de negocio
│   │   ├── ai_service.py     # Servicio de IA (LangChain)
│   │   ├── ansible_service.py # Ejecución con Ansible
│   │   ├── diagnostic_service.py # Recopilación de diagnósticos
│   │   ├── ssh_service.py    # Conexiones SSH
│   │   └── email_service.py  # Envío de emails SMTP
│   ├── utils/                # Utilidades
│   │   ├── encryption.py     # Encriptación de credenciales
│   │   └── auth.py           # Utilidades de autenticación
│   ├── models.py             # Modelos de base de datos
│   ├── schemas.py            # Esquemas Pydantic
│   ├── dependencies.py       # Dependencias de FastAPI
│   ├── settings.py           # Configuración
│   ├── database.py           # Configuración de BD
│   ├── main.py               # Punto de entrada
│   ├── create_superuser.py   # Script para crear admin
│   ├── init_tables.py        # Inicialización de tablas
│   └── requirements.txt      # Dependencias Python
├── frontend/
│   ├── src/
│   │   ├── app/              # Páginas de Next.js
│   │   │   ├── page.tsx      # Dashboard principal
│   │   │   ├── admin/        # Panel de administración
│   │   │   ├── login/        # Página de login
│   │   │   └── register/     # Página de registro
│   │   ├── components/       # Componentes React
│   │   │   ├── admin/        # Componentes del panel admin
│   │   │   │   ├── user-management.tsx
│   │   │   │   ├── server-management.tsx
│   │   │   │   ├── audit-logs.tsx
│   │   │   │   ├── ai-parameters.tsx
│   │   │   │   ├── backend-parameters.tsx
│   │   │   │   ├── frontend-parameters.tsx
│   │   │   │   ├── communication-settings.tsx
│   │   │   │   ├── security-settings.tsx
│   │   │   │   └── system-stats.tsx
│   │   │   ├── conversational-chat.tsx  # Chat con IA
│   │   │   ├── server-list.tsx          # Lista de servidores
│   │   │   ├── add-server-form.tsx      # Formulario
│   │   │   └── language-switcher.tsx    # Selector de idioma
│   │   ├── lib/              # Utilidades
│   │   │   ├── api.ts        # Cliente API
│   │   │   └── i18n-context.tsx # Contexto de i18n
│   │   └── i18n/             # Configuración i18n
│   ├── messages/             # Archivos de traducción
│   │   ├── en.json           # Inglés
│   │   └── es.json           # Español
│   ├── package.json
│   └── next.config.js
├── nginx/
│   └── nginx.conf            # Configuración de Nginx
├── docker-compose.yml        # Configuración Docker
├── README.md                 # Este archivo
├── DEVELOPER_GUIDE.md        # Guía para desarrolladores
└── technical_requirements.md # Requisitos técnicos
```

## 🔐 Seguridad

### Encriptación y Almacenamiento
- **Credenciales SSH encriptadas**: Las contraseñas y claves SSH se almacenan encriptadas en la base de datos usando Fernet (AES-128)
- **API Keys seguras**: Las claves de IA se almacenan encriptadas en la configuración
- **Contraseñas hasheadas**: Las contraseñas de usuarios usan bcrypt

### Control de Acceso
- **RBAC (Role-Based Access Control)**: Sistema de roles y permisos granulares
- **Filtrado por grupos**: Los usuarios solo ven servidores de sus grupos asignados
- **Aprobación humana**: Todos los comandos requieren confirmación del usuario
- **Dominios permitidos**: Lista blanca para registro automático

### Auditoría y Trazabilidad
- **Logs de auditoría**: Todas las acciones administrativas se registran
- **Logs de operaciones**: Historial completo de comandos ejecutados
- **Timestamps**: Todas las acciones incluyen fecha, hora y usuario

### Configuración de Seguridad
- **JWT tokens**: Autenticación basada en tokens con expiración configurable
- **CORS configurado**: Solo orígenes permitidos pueden acceder a la API
- **Variables de entorno**: Claves API nunca se hardcodean en el código
- **HTTPS recomendado**: Usar certificados SSL/TLS en producción

## 📧 Configuración de Email (SMTP)

### Configuración de Gmail

1. Ve a tu cuenta de Google → Seguridad
2. Activa la verificación en 2 pasos
3. Ve a "Contraseñas de aplicaciones"
4. Genera una contraseña para "Correo"
5. En el panel admin, configura:
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `587`
   - **SMTP Username**: `tu-email@gmail.com`
   - **SMTP Password**: La contraseña de aplicación de 16 caracteres
   - **Use TLS**: ✓ Activado

### Otros Proveedores

**Office 365 / Outlook:**
- Host: `smtp.office365.com`
- Port: `587`
- TLS: Activado

**SendGrid:**
- Host: `smtp.sendgrid.net`
- Port: `587`
- Username: `apikey`
- Password: Tu API key de SendGrid

**Mailgun:**
- Host: `smtp.mailgun.org`
- Port: `587`
- Username: Tu username de Mailgun
- Password: Tu password de Mailgun

## 📚 Documentación Adicional

- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)**: Guía completa para desarrolladores
- **[technical_requirements.md](./technical_requirements.md)**: Requisitos técnicos detallados

## 🔄 Actualizaciones Recientes

### v2.0.0 - Panel de Administración Completo
- ✅ Gestión completa de usuarios con RBAC
- ✅ Gestión de servidores y grupos
- ✅ Logs de auditoría con búsqueda y paginación
- ✅ Configuración dinámica del sistema (IA, Backend, Frontend)
- ✅ Sistema de comunicaciones con SMTP
- ✅ Seguridad avanzada con dominios permitidos
- ✅ Notificaciones para superadmins
- ✅ Filtrado de servidores por permisos de grupo
- ✅ Test de emails funcional

### v1.0.0 - Lanzamiento Inicial
- ✅ Chat conversacional con IA
- ✅ Diagnóstico automático de servidores
- ✅ Ejecución segura de comandos
- ✅ Soporte multilingüe (EN/ES)
- ✅ Base de conocimientos con RAG

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Autores

- **Sentrait Team** - [GitHub](https://github.com/sentrait)

## 🙏 Agradecimientos

- Amazon Bedrock por proporcionar acceso a Claude 3.5 Sonnet
- Google por Gemini 2.0 Flash
- OpenAI por GPT-4o
- La comunidad de LangChain
- shadcn/ui por los componentes UI
- Todos los contribuidores del proyecto

---

**¿Necesitas ayuda?** Abre un issue en GitHub o consulta la documentación completa.
