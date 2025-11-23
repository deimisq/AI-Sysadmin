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
**Happy Coding!** 🚀
