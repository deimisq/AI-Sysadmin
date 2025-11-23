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

Follow the **Quick Start** in `README.md`. Ensure you have the `.env` files configured correctly in both `backend/` and `frontend/`.

### 2. Making Changes to the Backend

-   **New Endpoint**:
    1.  Define schemas in `schemas.py`.
    2.  Create route handler in `routers/`.
    3.  Register router in `main.py`.
-   **Database Change**:
    1.  Modify `models.py`.
    2.  Run `alembic revision --autogenerate -m "description"`.
    3.  Run `alembic upgrade head`.
-   **AI Logic**:
    -   Modify `services/ai_service.py`.
    -   **Prompts**: The system prompts are defined here. Be careful when changing them as they affect the AI's personality and logic.

### 3. Making Changes to the Frontend

-   **New Component**: Create in `src/components/`. Use `shadcn/ui` components where possible.
-   **API Call**: Add function to `src/lib/api.ts`.
-   **Translation**:
    1.  Add keys to `messages/en.json` AND `messages/es.json`.
    2.  Use `const { t } = useI18n()` to access them.

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

### Security Model

-   **SSH Keys**: Stored as file paths. The app reads the key file to connect.
-   **Passwords**: Stored encrypted in DB using `cryptography.fernet`. Decrypted only in memory during connection.
-   **Command Execution**: **NEVER** automatic. The AI proposes, the User must click "Execute".

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
