# 🤖 AI Sysadmin Agent

> **Agente de IA conversacional para diagnóstico y resolución de problemas de infraestructura con soporte multilingüe**

Un sistema inteligente que diagnostica problemas de servidores Linux, propone soluciones basadas en datos reales y ejecuta comandos de forma segura con supervisión humana.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

## ✨ Características Principales

### 🧠 IA Conversacional Inteligente
- **Chat multi-turno**: Conversaciones naturales con el agente de IA
- **Análisis basado en datos reales**: Recopila métricas del servidor antes de diagnosticar
- **Verificación de problemas**: Detecta si el problema realmente existe o ya está resuelto
- **Explicaciones detalladas**: No solo ejecuta comandos, explica su razonamiento

### 🌍 Soporte Multilingüe
- **Inglés y Español**: Interfaz completamente traducida
- **IA bilingüe**: Responde en el idioma seleccionado por el usuario
- **Persistencia de preferencias**: Guarda el idioma elegido automáticamente

### 🔍 Diagnóstico Avanzado
- **Recopilación automática de diagnósticos**: CPU, memoria, procesos, logs, disco
- **RAG (Retrieval-Augmented Generation)**: Aprende de casos anteriores
- **Base de conocimientos vectorial**: PostgreSQL + pgvector para búsqueda semántica

### 🛡️ Ejecución Segura
- **Aprobación humana requerida**: Todos los comandos requieren confirmación
- **Integración con Ansible**: Ejecución estructurada y auditable
- **Logs de operaciones**: Historial completo de todas las acciones

### 🎨 Interfaz Moderna
- **Next.js 14** con React Server Components
- **Diseño responsive** con Tailwind CSS
- **Componentes UI** de shadcn/ui
- **Markdown rendering** para respuestas formateadas

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  Next.js 14 + React + Tailwind CSS + shadcn/ui             │
│  - Interfaz de chat conversacional                          │
│  - Gestión de servidores                                    │
│  - Selector de idioma (EN/ES)                               │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/REST API
┌──────────────────▼──────────────────────────────────────────┐
│                         Backend                              │
│  FastAPI + Python 3.10+                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  AI Service (LangChain)                            │    │
│  │  - Amazon Bedrock (Claude 3.5 Sonnet)             │    │
│  │  - Google Gemini 2.0 Flash                        │    │
│  │  - OpenAI GPT-4o                                  │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Diagnostic Service                                │    │
│  │  - SSH connection (asyncssh)                      │    │
│  │  - System metrics collection                      │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Ansible Service                                   │    │
│  │  - Command execution                              │    │
│  │  - Playbook running                               │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    PostgreSQL + pgvector                     │
│  - Servidores y credenciales (encriptadas)                  │
│  - Base de conocimientos con embeddings                     │
│  - Logs de operaciones                                      │
└─────────────────────────────────────────────────────────────┘
```

### 🚀 Inicio Rápido

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
# Levantar todo el stack (Frontend, Backend, DB)
sudo docker compose up --build -d
```

### 4. Ejecutar Migraciones de Base de Datos

```bash
# Ejecutar migraciones dentro del contenedor backend
sudo docker compose exec backend alembic upgrade head
```

### 5. Acceder a la Aplicación

-   **Frontend**: http://localhost:3000
-   **Backend API**: http://localhost:8000
-   **Documentación API**: http://localhost:8000/docs


## ⚙️ Configuración

### Variables de Entorno del Backend (`backend/.env`)

```env
# Database
DATABASE_URL=postgresql://sysadmin_agent:secure_password_dev@localhost:5432/sysadmin_agent_db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Provider (choose one)
LLM_PROVIDER=bedrock  # Options: bedrock, gemini, openai

# Amazon Bedrock (recommended)
AWS_BEARER_TOKEN_BEDROCK=your-bedrock-api-key
AWS_REGION=us-east-1

# Google Gemini (alternative)
GOOGLE_API_KEY=your-gemini-api-key

# OpenAI (alternative)
OPENAI_API_KEY=your-openai-api-key
```

### Variables de Entorno del Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## 📖 Guía de Uso

### 1. Agregar un Servidor

1. Haz clic en **"Add Server"** / **"Agregar Servidor"**
2. Completa la información:
   - Hostname
   - IP Address
   - SSH Username
   - SSH Password o SSH Private Key Path
3. Haz clic en **"Add Server"**

### 2. Diagnosticar un Problema

1. Selecciona un servidor de la lista
2. Haz clic en **"Diagnose"** / **"Diagnosticar"**
3. Describe el problema en lenguaje natural:
   - "El servidor tiene alto consumo de CPU"
   - "The server is running out of disk space"
4. El agente:
   - Recopilará datos diagnósticos automáticamente
   - Analizará la situación
   - Te dirá si el problema existe o no
   - Propondrá soluciones si es necesario

### 3. Ejecutar Comandos

1. Revisa el comando propuesto por la IA
2. Haz clic en **"Execute Command"** / **"Ejecutar Comando"**
3. El sistema ejecutará el comando y mostrará los resultados
4. La IA analizará automáticamente los resultados y continuará la conversación

### 4. Cambiar Idioma

1. Haz clic en el icono de globo 🌐 en la esquina superior derecha
2. Selecciona **English** o **Español**
3. La interfaz y las respuestas de la IA cambiarán inmediatamente

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
- **Version Control**: Git

## 📁 Estructura del Proyecto

```
ai_agent/
├── backend/
│   ├── alembic/              # Migraciones de base de datos
│   ├── routers/              # Endpoints de la API
│   │   ├── agent.py          # Endpoints del agente IA
│   │   └── inventory.py      # Gestión de servidores
│   ├── services/             # Lógica de negocio
│   │   ├── ai_service.py     # Servicio de IA (LangChain)
│   │   ├── ansible_service.py # Ejecución con Ansible
│   │   ├── diagnostic_service.py # Recopilación de diagnósticos
│   │   └── ssh_service.py    # Conexiones SSH
│   ├── utils/                # Utilidades
│   │   └── encryption.py     # Encriptación de credenciales
│   ├── models.py             # Modelos de base de datos
│   ├── schemas.py            # Esquemas Pydantic
│   ├── settings.py           # Configuración
│   ├── database.py           # Configuración de BD
│   ├── main.py               # Punto de entrada
│   └── requirements.txt      # Dependencias Python
├── frontend/
│   ├── src/
│   │   ├── app/              # Páginas de Next.js
│   │   ├── components/       # Componentes React
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
├── docker-compose.yml        # Configuración Docker
├── README.md                 # Este archivo
├── DEVELOPER_GUIDE.md        # Guía para desarrolladores
└── DEPLOYMENT.md             # Guía de despliegue
```

## 🔐 Seguridad

- **Credenciales encriptadas**: Las contraseñas SSH se almacenan encriptadas en la base de datos
- **Aprobación humana**: Todos los comandos requieren confirmación del usuario
- **Logs auditables**: Todas las operaciones se registran con timestamp y usuario
- **Variables de entorno**: Claves API nunca se hardcodean en el código
- **CORS configurado**: Solo orígenes permitidos pueden acceder a la API

## 📚 Documentación Adicional

- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)**: Guía completa para desarrolladores
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Instrucciones de despliegue en producción
- **[API_REFERENCE.md](./API_REFERENCE.md)**: Documentación de la API REST
- **[technical_requirements.md](./technical_requirements.md)**: Requisitos técnicos detallados

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
- La comunidad de LangChain
- shadcn/ui por los componentes UI
- Todos los contribuidores del proyecto

---

**¿Necesitas ayuda?** Abre un issue en GitHub o consulta la documentación completa.
