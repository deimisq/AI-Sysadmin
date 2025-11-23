# 📋 Technical Requirements

This document outlines the software, hardware, and network requirements for running the **AI Sysadmin Agent**.

## 🖥️ System Requirements

### Hardware (Minimum)
-   **CPU**: 2 vCPUs
-   **RAM**: 4 GB (8 GB recommended for better performance with Docker)
-   **Disk**: 20 GB SSD

### Operating System
-   **Linux**: Ubuntu 20.04/22.04 LTS (Recommended)
-   **macOS**: Sonoma or later
-   **Windows**: WSL2 (Ubuntu distro)

## 🛠️ Software Dependencies
The project is containerized, so the only **strict requirements** on the host machine are:

-   **Docker Engine**: Version 24.0+
-   **Docker Compose**: Version 2.0+
-   **Git**

*Note: Python and Node.js are NOT required on the host machine to run the application, as they run inside containers. However, having them installed is useful for IDE autocompletion.*

### Containerized Environment (Managed by Docker)
-   **Backend**: Python 3.11-slim
-   **Frontend**: Node.js 18-alpine
-   **Database**: PostgreSQL 16 with pgvector

### AI & Cloud Services
You must have access to **ONE** of the following LLM providers:

1.  **Amazon Bedrock (Recommended)**
    -   **AWS Account** with Bedrock access enabled.
    -   **Models Enabled**:
        -   `anthropic.claude-3-5-sonnet-20240620-v1:0` (Reasoning)
        -   `amazon.titan-embed-text-v1` (Embeddings)
    -   **Credentials**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or IAM Role), and `AWS_REGION`.

2.  **Google Gemini**
    -   **Google Cloud Project** with Vertex AI or Gemini API enabled.
    -   **API Key**.

3.  **OpenAI**
    -   **API Key** with access to GPT-4o.

## 🌐 Network Requirements

### Inbound
-   **Port 3000**: Frontend Web UI (HTTP).
-   **Port 8000**: Backend API (HTTP).
-   **Port 22**: SSH (for server management access).

### Outbound
The server running the agent needs outbound access to:
-   **Target Servers**: Port 22 (SSH) to manage them.
-   **LLM APIs**:
    -   AWS Bedrock endpoints (`bedrock-runtime.us-east-1.amazonaws.com`)
    -   Or OpenAI/Google APIs via HTTPS (443).
-   **Package Repositories**: PyPI, npm registry, Docker Hub.

## 📦 Python Dependencies (Backend)
*See `backend/requirements.txt` for exact versions.*

-   `fastapi`, `uvicorn`: Web server
-   `sqlalchemy`, `alembic`, `psycopg2-binary`, `pgvector`: Database
-   `langchain`, `langchain-aws`, `langchain-google-genai`, `langchain-openai`: AI Framework
-   `boto3`: AWS SDK
-   `asyncssh`, `paramiko`: SSH connectivity
-   `cryptography`: Security
-   `pydantic`, `pydantic-settings`: Validation

## 📦 Node.js Dependencies (Frontend)
*See `frontend/package.json` for exact versions.*

-   `next`, `react`, `react-dom`: Core framework
-   `tailwindcss`, `postcss`, `autoprefixer`: Styling
-   `lucide-react`: Icons
-   `shadcn/ui` (@radix-ui/*): UI Components
-   `react-markdown`: Markdown rendering
-   `next-intl`: Internationalization

## 🔑 Environment Variables

### Backend (`backend/.env`)
```ini
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Provider Configuration
LLM_PROVIDER=bedrock
AWS_BEARER_TOKEN_BEDROCK=...
AWS_REGION=us-east-1
```

### Frontend (`frontend/.env.local`)
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```
