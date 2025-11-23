# 👨‍💻 Developer Guide - AI Sysadmin Agent

Welcome to the **AI Sysadmin Agent** project! This guide is designed to help new developers understand the codebase, the technologies used, and how to contribute effectively.

## 🏗️ Project Architecture

The application follows a modern **Client-Server architecture**:

- **Frontend**: A Single Page Application (SPA) built with Next.js 14.
- **Backend**: A RESTful API built with FastAPI (Python).
- **Database**: PostgreSQL with `pgvector` extension for vector similarity search.
- **AI Engine**: Integrates with LLM providers (Bedrock, Gemini, OpenAI) via LangChain.

### High-Level Data Flow

1.  **User Interaction**: User interacts with the Chat UI in the Frontend.
2.  **API Request**: Frontend sends requests to Backend API (e.g., `POST /api/v1/agent/diagnose`).
3.  **Diagnostic Phase**:
    - Backend connects to the target server via SSH.
    - Runs diagnostic commands (top, free, df, logs).
    - Returns raw data.
4.  **AI Analysis**:
    - Raw data + User Query are sent to the LLM (Claude 3.5 Sonnet via Bedrock).
    - RAG: Similar past cases are retrieved from the Vector DB.
    - LLM generates an analysis and optionally a proposed command.
5.  **Response**: Analysis is displayed to the user.
6.  **Execution (Optional)**:
    - User approves command.
    - Backend executes command via SSH/Ansible.
    - Results are fed back to AI for post-execution analysis.

## 🛠️ Technology Stack & Libraries

### Backend (`/backend`)

-   **Language**: Python 3.10+
-   **Web Framework**: **FastAPI** - High performance, easy to use, auto-generated docs.
-   **ORM**: **SQLAlchemy 2.0** - Database interaction.
-   **Migrations**: **Alembic** - Database schema changes.
-   **AI/LLM**:
    -   **LangChain**: Framework for LLM applications.
    -   **Boto3**: AWS SDK for Amazon Bedrock.
    -   **LangChain AWS**: Integration for Bedrock.
    -   **Google Generative AI**: For Gemini integration.
-   **SSH/Remote**:
    -   **AsyncSSH**: For asynchronous SSH connections.
    -   **Paramiko**: Low-level SSH client (fallback/utils).
    -   **Ansible Runner**: For executing Ansible playbooks (planned/partial).
-   **Security**:
    -   **Cryptography**: Fernet encryption for storing sensitive SSH passwords/keys.
    -   **Pydantic**: Data validation and serialization.

### Frontend (`/frontend`)

-   **Framework**: **Next.js 14** (App Router).
-   **Language**: **TypeScript**.
-   **Styling**: **Tailwind CSS**.
-   **UI Components**: **shadcn/ui** (built on Radix UI).
-   **State Management**: React Hooks (`useState`, `useContext`).
-   **Internationalization**: Custom Context + `next-intl` (partial) for EN/ES support.
-   **Markdown**: `react-markdown` for rendering AI responses.
-   **Icons**: `lucide-react`.

### Database

-   **PostgreSQL 14+**.
-   **pgvector**: Extension for storing embeddings (1536 dimensions for Titan/OpenAI models).

## 📂 Directory Structure Explained

```
ai_agent/
├── backend/
│   ├── alembic/              # Database migration scripts
│   ├── routers/              # API Route definitions
│   │   ├── agent.py          # Core AI logic endpoints (diagnose, execute)
│   │   └── inventory.py      # CRUD for Servers and Clients
│   ├── services/             # Business Logic Layer
│   │   ├── ai_service.py     # LangChain setup, Prompt Engineering, RAG
│   │   ├── diagnostic_service.py # SSH command collection logic
│   │   ├── ssh_service.py    # SSH connection handling
│   │   └── ansible_service.py # Ansible integration
│   ├── utils/                # Helpers (encryption, logging)
│   ├── models.py             # SQLAlchemy Database Models
│   ├── schemas.py            # Pydantic Request/Response Schemas
│   ├── settings.py           # Environment configuration management
│   └── main.py               # App entry point
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js Pages & Layouts
│   │   ├── components/       # Reusable React Components
│   │   │   ├── conversational-chat.tsx # The main chat interface
│   │   │   └── ...
│   │   ├── lib/              # Utilities (API client, i18n context)
│   │   └── i18n/             # i18n configuration
│   ├── messages/             # Translation JSON files (en.json, es.json)
│   └── ...
└── ...
```

## 🚀 Development Workflow

### 1. Setting up the Environment
The project is fully Dockerized for development. This ensures your local environment matches production.

1.  **Clone & Configure**:
    ```bash
    git clone ...
    cp backend/.env.example backend/.env
    cp frontend/.env.local.example frontend/.env.local
    ```
2.  **Start Services**:
    ```bash
    docker compose up --build
    ```
    This starts:
    -   Frontend (Hot-reload enabled)
    -   Backend (Hot-reload enabled)
    -   Database

3.  **Run Migrations**:
    ```bash
    docker compose exec backend alembic upgrade head
    ```

### 2. Making Changes to the Backend
Since the backend volume is mounted (`./backend:/app`), any change you make to the python files will trigger a **hot-reload** inside the container. You don't need to restart Docker.

-   **New Dependency**: If you add a package to `requirements.txt`, you MUST rebuild the container:
    ```bash
    docker compose up -d --build backend
    ```

### 3. Making Changes to the Frontend
Similarly, the frontend volume is mounted. Changes to `src/` will trigger a **Hot Module Replacement (HMR)** in the browser instantly.

-   **New Dependency**: If you run `npm install package`, you should also rebuild or run npm install inside the container:
    ```bash
    docker compose exec frontend npm install package
    ```


### 4. Testing

-   **Backend**: Run `pytest` (if tests are set up) or use `test_bedrock.py` / `test_gemini.py` for specific integrations.
-   **Manual Testing**: Use the UI to add a test server (can be localhost) and run diagnostics.

## 🔑 Key Concepts & Implementation Details

### AI "Thinking" Process (`ai_service.py`)

The `analyze_problem` method is the brain. It:
1.  **Contextualizes**: Fetches similar past cases from DB (RAG).
2.  **Prompts**: Constructs a prompt with:
    -   System instructions (Role, constraints, output format).
    -   Server Info (OS, IP).
    -   Real Diagnostic Data (The output of `top`, `logs`, etc.).
    -   User Query.
3.  **Invokes**: Calls the LLM (Bedrock/Claude).
4.  **Parses**: Extracts the analysis and any proposed bash commands.

### Conversational State

The frontend maintains the chat history. The backend is stateless regarding the conversation *flow*, but it receives the context in each request.
*Note: Currently, the backend analyzes "snapshots" of data. Future improvements could include passing full chat history to the LLM.*

### Detailed Data Flow (Real-World)

1.  **User Interaction**: User sends a command or question in the Chat (Frontend).
2.  **API Request**: Frontend sends `POST /api/v1/agent/diagnose` to Backend.
3.  **Credential Retrieval**:
    -   Backend queries PostgreSQL for the server's details.
    -   **Decryption**: Encrypted SSH passwords or key paths are decrypted in memory using `cryptography.fernet`.
4.  **SSH Connection**:
    -   Backend connects to the target server using `asyncssh` or `openssh-client`.
    -   *Note*: In Docker, host SSH keys (`~/.ssh`) are mounted into the container to allow identity-based auth.
5.  **Diagnostic Execution**:
    -   Backend runs diagnostic commands (`top`, `df`, `logs`) on the target server.
    -   Output is captured.
6.  **AI Processing**:
    -   Diagnostic output + User Query + RAG Context are sent to **Amazon Bedrock** (Claude 3.5 Sonnet).
7.  **Response Generation**:
    -   Bedrock returns an analysis and potential commands.
    -   Backend formats this and sends it to Frontend.
8.  **User Feedback**:
    -   User sees the analysis.
    -   If a command is proposed, User clicks "Execute".
    -   Backend executes the command and returns the result.
    -   **Loop**: The result is automatically fed back to the AI for further analysis.

### Security Model & Encryption

-   **Data at Rest**:
    -   **SSH Passwords**: Stored in the `servers` table, encrypted using **Fernet (AES-128-CBC with HMAC)**.
    -   **SSH Key Paths**: Also encrypted in the database to prevent path enumeration attacks.
-   **Encryption Key Management**:
    -   Uses a salt (`ENCRYPTION_SALT`) and a key derived from `ENCRYPTION_KEY` env var.
    -   **Critical**: In production, `ENCRYPTION_KEY` must be set in `.env` to a secure random value.
-   **SSH Identity**:
    -   The backend container mounts the host's `~/.ssh` directory (read-only) to access private keys.
    -   This avoids storing actual private key content in the database, leveraging the host's secure key management.
-   **Command Execution**:
    -   **Human-in-the-loop**: The AI *cannot* execute commands autonomously. It can only *propose* them.
    -   User approval is strictly required for every execution action.

## 🐛 Troubleshooting Common Issues

-   **"Connection Refused" (Frontend -> Backend)**: Check if Backend is running on port 8000. Check CORS settings in `main.py`.
-   **"SSH Permission Denied"**: Check if the SSH key path is correct and readable by the user running the backend. Check `authorized_keys` on target.
-   **"Bedrock Error"**: Check AWS credentials in `.env`. Ensure the model `anthropic.claude-3-5-sonnet...` is enabled in your AWS Bedrock console.

## 🤝 Contribution Guidelines

1.  Create a feature branch.
2.  Commit often with clear messages.
3.  Ensure code is formatted (PEP8 for Python, Prettier for JS/TS).
4.  Update documentation if you change logic.

---
# 👨‍💻 Guía del Desarrollador - Agente AI Sysadmin (Versión en Español)

¡Bienvenido al proyecto **AI Sysadmin Agent**! Esta guía está diseñada para ayudar a los nuevos desarrolladores a entender la base de código, las tecnologías usadas y cómo contribuir de forma efectiva.

## 🏗️ Arquitectura del Proyecto

La aplicación sigue una arquitectura moderna de **Cliente-Servidor**:

- **Frontend**: Una aplicación de una sola página (SPA) construida con Next.js 14.
- **Backend**: Una API RESTful construida con FastAPI (Python).
- **Base de datos**: PostgreSQL con la extensión `pgvector` para búsqueda por similitud vectorial.
- **Motor de IA**: Integra proveedores de LLM (Bedrock, Gemini, OpenAI) a través de LangChain.

### Flujo de Datos a Alto Nivel

1.  **Interacción del Usuario**: El usuario interactúa con la interfaz de chat en el Frontend.
2.  **Solicitud API**: El Frontend envía solicitudes al Backend (por ejemplo, `POST /api/v1/agent/diagnose`).
3.  **Fase de Diagnóstico**:
    - El Backend se conecta al servidor objetivo vía SSH.
    - Ejecuta comandos de diagnóstico (top, free, df, logs).
    - Devuelve datos en bruto.
4.  **Análisis por IA**:
    - Los datos en bruto + la consulta del usuario se envían al LLM (Claude 3.5 Sonnet vía Bedrock).
    - RAG: Se recuperan casos pasados similares desde la BD vectorial.
    - El LLM genera un análisis y, opcionalmente, un comando propuesto.
5.  **Respuesta**: El análisis se muestra al usuario.
6.  **Ejecución (Opcional)**:
    - El usuario aprueba el comando.
    - El Backend ejecuta el comando vía SSH/Ansible.
    - Los resultados se reinyectan a la IA para análisis posterior.

## 🛠️ Stack Tecnológico y Librerías

### Backend (`/backend`)

- **Lenguaje**: Python 3.10+
- **Framework Web**: **FastAPI** - Alto rendimiento, fácil de usar, documentación automática.
- **ORM**: **SQLAlchemy 2.0** - Interacción con la base de datos.
- **Migraciones**: **Alembic** - Cambios en el esquema de la BD.
- **IA/LLM**:
    - **LangChain**: Framework para aplicaciones con LLM.
    - **Boto3**: SDK de AWS para Amazon Bedrock.
    - **LangChain AWS**: Integración para Bedrock.
    - **Google Generative AI**: Para integración con Gemini.
- **SSH/Remoto**:
    - **AsyncSSH**: Para conexiones SSH asíncronas.
    - **Paramiko**: Cliente SSH de bajo nivel (fallback/utilidades).
    - **Ansible Runner**: Para ejecutar playbooks de Ansible (planificado/parcial).
- **Seguridad**:
    - **Cryptography**: Encriptación Fernet para almacenar contraseñas/llaves SSH sensibles.
    - **Pydantic**: Validación y serialización de datos.

### Frontend (`/frontend`)

- **Framework**: **Next.js 14** (App Router).
- **Lenguaje**: **TypeScript**.
- **Estilos**: **Tailwind CSS**.
- **Componentes UI**: **shadcn/ui** (basado en Radix UI).
- **Gestión de Estado**: Hooks de React (`useState`, `useContext`).
- **Internacionalización**: Contexto personalizado + `next-intl` (parcial) para soporte EN/ES.
- **Markdown**: `react-markdown` para renderizar respuestas de la IA.
- **Íconos**: `lucide-react`.

### Base de Datos

- **PostgreSQL 14+**.
- **pgvector**: Extensión para almacenar embeddings (1536 dimensiones para modelos Titan/OpenAI).

## 📂 Estructura de Directorios Explicada

```
ai_agent/
├── backend/
│   ├── alembic/              # Scripts de migración de la base de datos
│   ├── routers/              # Definiciones de rutas API
│   │   ├── agent.py          # Endpoints de lógica central de IA (diagnosticar, ejecutar)
│   │   └── inventory.py      # CRUD para Servidores y Clientes
│   ├── services/             # Capa de Lógica de Negocio
│   │   ├── ai_service.py     # Configuración de LangChain, Ingeniería de Prompts, RAG
│   │   ├── diagnostic_service.py # Lógica de recolección de comandos SSH
│   │   ├── ssh_service.py    # Manejo de conexiones SSH
│   │   └── ansible_service.py # Integración con Ansible
│   ├── utils/                # Helpers (encriptación, logging)
│   ├── models.py             # Modelos de Base de Datos SQLAlchemy
│   ├── schemas.py            # Esquemas Pydantic de Requests/Responses
│   ├── settings.py           # Gestión de configuración por entorno
│   └── main.py               # Punto de entrada de la app
├── frontend/
│   ├── src/
│   │   ├── app/              # Páginas y Layouts de Next.js
│   │   ├── components/       # Componentes React reutilizables
│   │   │   ├── conversational-chat.tsx # La interfaz principal de chat
│   │   │   └── ...
│   │   ├── lib/              # Utilidades (cliente API, contexto i18n)
│   │   └── i18n/             # Configuración de i18n
│   ├── messages/             # Archivos JSON de traducción (en.json, es.json)
│   └── ...
└── ...
```

## 🚀 Flujo de Desarrollo

### 1. Configurar el Entorno
El proyecto está completamente dockerizado para desarrollo. Esto asegura que tu entorno local coincida con producción.

1.  **Clonar y Configurar**:
    ```bash
    git clone ...
    cp backend/.env.example backend/.env
    cp frontend/.env.local.example frontend/.env.local
    ```
2.  **Iniciar Servicios**:
    ```bash
    docker compose up --build
    ```
    Esto inicia:
    - Frontend (Hot-reload habilitado)
    - Backend (Hot-reload habilitado)
    - Base de datos

3.  **Ejecutar Migraciones**:
    ```bash
    docker compose exec backend alembic upgrade head
    ```

### 2. Hacer Cambios en el Backend
Dado que el volumen del backend está montado (`./backend:/app`), cualquier cambio en los archivos Python activará un **hot-reload** dentro del contenedor. No necesitas reiniciar Docker.

- **Nueva Dependencia**: Si añades un paquete a `requirements.txt`, DEBES reconstruir el contenedor:
    ```bash
    docker compose up -d --build backend
    ```

### 3. Hacer Cambios en el Frontend
De manera similar, el volumen del frontend está montado. Los cambios en `src/` activarán un **Hot Module Replacement (HMR)** en el navegador al instante.

- **Nueva Dependencia**: Si ejecutas `npm install package`, también deberías reconstruir o ejecutar npm install dentro del contenedor:
    ```bash
    docker compose exec frontend npm install package
    ```

### 4. Testing

- **Backend**: Ejecuta `pytest` (si hay tests configurados) o utiliza `test_bedrock.py` / `test_gemini.py` para integraciones específicas.
- **Pruebas Manuales**: Usa la UI para añadir un servidor de prueba (puede ser localhost) y ejecutar diagnósticos.

## 🔑 Conceptos Clave y Detalles de Implementación

### Proceso de "Pensamiento" de la IA (`ai_service.py`)

El método `analyze_problem` es el cerebro. Él:
1.  **Contextualiza**: Recupera casos pasados similares desde la BD (RAG).
2.  **Construye Prompts**: Conforma un prompt con:
    - Instrucciones del sistema (rol, restricciones, formato de salida).
    - Información del servidor (SO, IP).
    - Datos reales de diagnóstico (la salida de `top`, `logs`, etc.).
    - Consulta del usuario.
3.  **Invoca**: Llama al LLM (Bedrock/Claude).
4.  **Parsea**: Extrae el análisis y cualquier comando bash propuesto.

### Estado Conversacional

El frontend mantiene el historial de chat. El backend es estateless respecto al flujo de conversación, pero recibe el contexto en cada solicitud.
*Nota: Actualmente, el backend analiza "instantáneas" de datos. Mejora futura podría incluir enviar el historial completo del chat al LLM.*

### Flujo de Datos (En Producción)

1.  **Interacción del Usuario**: El usuario envía un comando o pregunta en el chat (Frontend).
2.  **Solicitud API**: El Frontend envía `POST /api/v1/agent/diagnose` al Backend.
3.  **Recuperación de Credenciales**:
    - El Backend consulta PostgreSQL por los detalles del servidor.
    - **Desencriptado**: Las contraseñas o rutas de llaves SSH encriptadas se desencriptan en memoria usando `cryptography.fernet`.
4.  **Conexión SSH**:
    - El Backend se conecta al servidor objetivo usando `asyncssh` o `openssh-client`.
    - *Nota*: En Docker, las llaves SSH del host (`~/.ssh`) se montan en el contenedor para permitir autenticación basada en identidad.
5.  **Ejecución de Diagnóstico**:
    - El Backend ejecuta comandos de diagnóstico (`top`, `df`, `logs`) en el servidor objetivo.
    - Se captura la salida.
6.  **Procesamiento por IA**:
    - Salida de diagnóstico + Consulta del usuario + Contexto RAG se envían a **Amazon Bedrock** (Claude 3.5 Sonnet).
7.  **Generación de Respuesta**:
    - Bedrock devuelve un análisis y posibles comandos.
    - El Backend formatea esto y lo envía al Frontend.
8.  **Retroalimentación del Usuario**:
    - El usuario ve el análisis.
    - Si se propone un comando, el usuario hace clic en "Execute".
    - El Backend ejecuta el comando y devuelve el resultado.
    - **Bucle**: El resultado se alimenta automáticamente de nuevo a la IA para más análisis.

### Modelo de Seguridad y Encriptación

- **Datos en Reposo**:
    - **Contraseñas SSH**: Almacenadas en la tabla `servers`, encriptadas usando **Fernet (AES-128-CBC con HMAC)**.
    - **Rutas de Llaves SSH**: También encriptadas en la base de datos para prevenir ataques de enumeración de rutas.
- **Gestión de Claves de Encriptación**:
    - Usa una sal (`ENCRYPTION_SALT`) y una clave derivada de la variable de entorno `ENCRYPTION_KEY`.
    - **Crítico**: En producción, `ENCRYPTION_KEY` debe establecerse en `.env` con un valor aleatorio seguro.
- **Identidad SSH**:
    - El contenedor backend monta el directorio `~/.ssh` del host (solo lectura) para acceder a llaves privadas.
    - Esto evita almacenar el contenido real de llaves privadas en la base de datos, aprovechando la gestión de llaves del host.
- **Ejecución de Comandos**:
    - **Human-in-the-loop**: La IA *no puede* ejecutar comandos de forma autónoma. Solo puede *proponerlos*.
    - La aprobación del usuario es estrictamente requerida para cada acción de ejecución.

## 🐛 Solución de Problemas Comunes

- **"Connection Refused" (Frontend -> Backend)**: Verifica si el Backend está corriendo en el puerto 8000. Revisa la configuración de CORS en `main.py`.
- **"SSH Permission Denied"**: Comprueba que la ruta de la llave SSH es correcta y legible por el usuario que ejecuta el backend. Revisa `authorized_keys` en el objetivo.
- **"Bedrock Error"**: Revisa las credenciales AWS en `.env`. Asegúrate de que el modelo `anthropic.claude-3-5-sonnet...` esté habilitado en tu consola de Amazon Bedrock.

## 🤝 Guía de Contribución

1.  Crea una rama de feature.
2.  Haz commits frecuentes con mensajes claros.
3.  Asegúrate de que el código esté formateado (PEP8 para Python, Prettier para JS/TS).
4.  Actualiza la documentación si cambias la lógica.

---
**¡Feliz código!** 🚀
