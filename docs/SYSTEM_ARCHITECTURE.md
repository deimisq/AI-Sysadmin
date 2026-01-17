# AI Sysadmin Agent - System Architecture & Functionality Guide

**Version**: 1.0.0-RC  
**Last Updated**: January 17, 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Functionalities](#core-functionalities)
3. [Architecture Components](#architecture-components)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Web Architecture](#frontend-web-architecture)
6. [Desktop Application Architecture](#desktop-application-architecture)
7. [Data Flow & Communication](#data-flow--communication)
8. [Security Model](#security-model)
9. [Deployment Modes](#deployment-modes)

---

## System Overview

AI Sysadmin Agent is a comprehensive platform for intelligent server management, diagnostics, and automation powered by AI. The system operates on a **client-server architecture** with support for both web and desktop interfaces.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT TIER                              │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │  Desktop App     │         │   Web Browser (SPA)    │  │
│  │  (Tauri/React)   │         │   (Next.js 14)         │  │
│  └────────┬─────────┘         └───────────┬─────────────┘  │
│           │                               │                 │
│           └───────────────┬───────────────┘                 │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTPS/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   SERVER TIER                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Nginx (Reverse Proxy & SSL)                 │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────▼─────────────────────────────┐  │
│  │      FastAPI Backend (Python)                        │  │
│  │  ┌──────────┬──────────┬──────────┬────────────┐    │  │
│  │  │ Auth     │ Inventory│ AI Agent │ Admin      │    │  │
│  │  │ Router   │ Router   │ Router   │ Router     │    │  │
│  │  └──────────┴──────────┴──────────┴────────────┘    │  │
│  │           │           │           │                   │  │
│  │  ┌────────▼───────────▼───────────▼────────────┐    │  │
│  │  │        Business Logic Layer                  │    │  │
│  │  │  (Services: AI, SSH, Diagnostic, Audit)      │    │  │
│  │  └──────────────────────┬───────────────────────┘    │  │
│  └─────────────────────────┼──────────────────────────────┘
│                            │                                │
│  ┌─────────────────────────▼──────────────────────────┐   │
│  │    PostgreSQL + pgvector (Data Layer)              │   │
│  │  - User Management                                  │   │
│  │  - Server Inventory                                 │   │
│  │  - Audit Logs                                       │   │
│  │  - AI Conversation History (Vectorized)            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │   Target Servers (SSH)        │
            │   - Linux/Unix Systems        │
            └───────────────────────────────┘
```

---

## Core Functionalities

### 1. **AI-Powered Diagnostics**

- Natural language interaction for server troubleshooting
- Automated command execution with human approval
- Context-aware analysis using RAG (Retrieval-Augmented Generation)
- Support for multiple LLM providers: Google Gemini, AWS Bedrock (Claude), OpenAI

### 2. **Multi-Server Management**

- Centralized inventory of servers organized by groups
- Secure SSH credential management (encrypted at rest)
- Bulk operations via CSV import
- Real-time server statistics and health monitoring

### 3. **Interactive SSH Console**

- Web-based terminal emulator (xterm.js)
- WebSocket connection for real-time command execution
- Full terminal features (colors, vim, nano support)

### 4. **Scheduled Diagnostics & Reports**

- Automated health checks on custom schedules
- Email notifications for critical issues
- PDF report generation with historical data
- Configurable thresholds and alert rules

### 5. **Role-Based Access Control (RBAC)**

- Four role levels: Super Admin, Admin, User, Viewer
- Group-based permissions for server access
- Granular permission inheritance
- User invitation system with domain whitelisting

### 6. **Comprehensive Audit Logging**

- Automatic logging of all critical actions
- Traceability: Who did what, when, and from where
- Exportable audit trails (CSV)
- Real-time statistics dashboard

### 7. **Documentation System**

- Integrated knowledge base with Markdown support
- Category organization
- Version control (author tracking)
- Image upload for visual guides

---

## Architecture Components

### Technology Stack

#### Backend

- **Runtime**: Python 3.11+
- **Web Framework**: FastAPI (async, high-performance)
- **ORM**: SQLAlchemy 2.0 (declarative models)
- **Database**: PostgreSQL 14+ with pgvector extension
- **Migrations**: Alembic
- **AI/LLM**: LangChain (orchestration), Boto3 (AWS), Google AI SDK
- **SSH**: AsyncSSH, Paramiko
- **Security**: Cryptography (Fernet), python-jose (JWT), passlib (bcrypt)
- **Task Scheduling**: APScheduler

#### Frontend Web (SaaS Mode)

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: React Hooks, Context API
- **HTTP Client**: Fetch API
- **Internationalization**: Custom i18n context (EN/ES)
- **Terminal**: xterm.js + xterm-addon-fit

#### Desktop Application

- **Framework**: Tauri 2.0 (Rust + WebView)
- **Frontend**: React 18 + TypeScript
- **Routing**: React Router v6
- **Build Size**: ~15-20 MB (optimized)
- **Backend Connection**: REST API to cloud backend
- **Local Mode**: Optional SQLite if running backend locally

#### Infrastructure

- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx (reverse proxy, SSL termination)
- **SSL**: Let's Encrypt certificates (auto-renewal)

---

## Backend Architecture

### Layered Structure

```
backend/
├── main.py                    # FastAPI app entrypoint, middleware, CORS
├── database.py                # SQLAlchemy engine, session management
├── models.py                  # Database models (User, Server, AuditLog, etc.)
├── schemas.py                 # Pydantic schemas for request/response validation
├── settings.py                # Environment configuration (Pydantic Settings)
├── desktop_config.py          # Desktop mode detection & path configuration
├── dependencies.py            # Dependency injection (auth, DB session)
│
├── routers/                   # API route handlers (controllers)
│   ├── auth.py                # Login, register, Microsoft OAuth
│   ├── inventory.py           # Server & group CRUD
│   ├── agent.py               # AI diagnostic & execution
│   ├── admin.py               # User management, audit logs, stats
│   ├── config.py              # System configuration
│   ├── scheduled_reports.py  # Report scheduling
│   └── documentation.py       # Knowledge base articles
│
├── services/                  # Business logic layer
│   ├── ai_service.py          # LLM interaction, RAG, prompt engineering
│   ├── diagnostic_service.py # Server health check commands
│   ├── ssh_service.py         # SSH connection management
│   ├── audit_service.py       # Centralized audit logging
│   ├── scheduler_service.py  # APScheduler task management
│   └── report_service.py      # PDF generation (ReportLab)
│
├── utils/                     # Helper functions
│   ├── auth.py                # Password hashing, JWT creation/validation
│   ├── encryption.py          # Fernet encryption for credentials
│   └── permissions.py         # RBAC permission checks
│
└── alembic/                   # Database migrations
    └── versions/              # Timestamped migration files
```

### Key Design Patterns

1. **Dependency Injection**: FastAPI's `Depends()` for DB sessions, current user
2. **Service Layer**: Business logic isolated from HTTP handlers
3. **Repository Pattern**: SQLAlchemy ORM for data access
4. **Middleware**: CORS, custom audit middleware (in development)

### Database Models

#### Core Entities

- **User**: Authentication, roles, notification preferences
- **Server**: SSH credentials (encrypted), metadata, health status
- **ServerGroup**: Logical organization, owner assignment
- **UserGroupPermission**: Many-to-many relationship for access control
- **AuditLog**: Action tracking with JSON details field
- **ScheduledHealthCheck**: Cron-like task definitions
- **DocumentationArticle**: Knowledge base content with versioning

#### Special Features

- **pgvector**: Stores AI conversation embeddings for similarity search
- **JSON Fields**: Flexible storage for dynamic data (audit details, server metadata)
- **Encrypted Fields**: SSH passwords and key paths use Fernet encryption

---

## Frontend Web Architecture

### Next.js Structure

```
frontend/src/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Root layout with providers
│   ├── page.tsx               # Landing page
│   ├── login/page.tsx         # Authentication page
│   ├── dashboard/page.tsx     # Main server list
│   ├── console/[id]/page.tsx  # SSH terminal
│   └── admin/page.tsx         # Admin panel
│
├── components/                # Reusable React components
│   ├── ui/                    # shadcn primitives (Button, Dialog, etc.)
│   ├── conversational-chat.tsx # AI chat interface
│   ├── terminal.tsx            # xterm.js wrapper
│   ├── csv-import.tsx          # Bulk server upload
│   ├── admin/                  # Admin panel subcomponents
│   │   ├── user-management.tsx
│   │   ├── audit-logs.tsx
│   │   └── system-stats.tsx
│   └── ...
│
├── lib/                       # Utilities
│   ├── api.ts                 # Fetch wrapper with auth headers
│   └── language-context.tsx   # i18n provider
│
└── messages/                  # Translation files
    ├── en.json
    └── es.json
```

### State Management

- **Global State**: React Context for user session, language
- **Server State**: Direct API calls with React hooks (`useState`, `useEffect`)
- **Optimistic Updates**: Immediate UI feedback before server confirmation
- **WebSocket**: Only for SSH terminal (real-time)

### Routing & Navigation

- **Next.js App Router**: File-based routing
- **Protected Routes**: Middleware checks JWT token validity
- **Dynamic Routes**: `[id]` for server-specific pages

---

## Desktop Application Architecture

### Tauri Architecture

```
frontend-desktop/
├── src/                       # React application (same structure as web)
│   ├── routes/                # Page components
│   ├── components/            # Shared UI components
│   └── lib/api.ts             # API client (configured for remote backend)
│
├── src-tauri/                 # Rust backend wrapper
│   ├── src/main.rs            # Tauri app initialization
│   ├── tauri.conf.json        # App configuration (name, version, permissions)
│   └── icons/                 # App icons (PNG, ICO)
│
└── dist/                      # Compiled React bundle (embedded in Tauri)
```

### Desktop vs Web Differences

| Feature | Desktop App | Web App |
|---------|-------------|---------|
| **Backend** | Connects to remote cloud backend via HTTPS | Proxied through Nginx |
| **Auth Storage** | LocalStorage (same as web) | LocalStorage |
| **Database** | PostgreSQL (remote) | PostgreSQL (server) |
| **Offline Mode** | Not supported (requires backend) | Not supported |
| **Updates** | Manual download or auto-update (planned) | Instant (browser refresh) |
| **Platform** | Windows, Linux, macOS | Any browser |

### Build Process

1. **Frontend Compilation**: `npm run build` (Vite bundler)
2. **Tauri Packaging**: `npm run tauri build`
3. **Output**: Platform-specific installer (`.msi`, `.AppImage`, `.dmg`)
4. **Size**: ~15 MB (includes WebView runtime)

---

## Data Flow & Communication

### Request Lifecycle (Example: Execute Command)

```
1. User clicks "Execute" in Desktop App
   │
2. Desktop App → HTTPS POST /api/v1/agent/execute
   │  Headers: { Authorization: Bearer <JWT> }
   │  Body: { server_id: 123, command: "df -h" }
   │
3. Nginx → FastAPI Backend
   │
4. FastAPI Middleware
   │  - CORS validation
   │  - Extract JWT from header
   │
5. Dependency Injection
   │  - Decode & validate JWT → get User object
   │  - Open DB session
   │
6. Router Handler (agent.py)
   │  - Permission check: Can user access server 123?
   │  - Audit log: "execute_command" action
   │
7. Service Layer (ssh_service.py)
   │  - Decrypt SSH credentials from DB
   │  - Establish SSH connection to target server
   │  - Execute command: "df -h"
   │  - Capture output
   │
8. AI Analysis (ai_service.py) [Optional]
   │  - Send output to LLM for interpretation
   │  - Generate human-readable summary
   │
9. Response
   │  - Return JSON: { output: "...", analysis: "..." }
   │
10. Desktop App
    │  - Display output in UI
    │  - Update chat history
```

### WebSocket Flow (SSH Terminal)

```
1. User opens Console page for Server 123
   │
2. Desktop App → WebSocket connection
   │  ws://backend/api/v1/ws/ssh/123?token=<JWT>
   │
3. Backend (inventory.py WebSocket endpoint)
   │  - Validate JWT from query param
   │  - Establish SSH connection
   │  - Create bidirectional stream
   │
4. User types "ls -la" → WebSocket sends
   │
5. Backend → SSH server → Execute
   │
6. SSH output → Backend → WebSocket → Desktop App
   │  - xterm.js renders output in real-time
```

---

## Security Model

### Authentication & Authorization

1. **JWT Tokens**: Issued on login, valid for 30 minutes
2. **Password Hashing**: Bcrypt with salt rounds
3. **Role Hierarchy**: Superadmin > Admin > User > Viewer
4. **Group-Level Permissions**: Fine-grained access to server groups

### Data Protection

1. **Encrypted at Rest**: SSH passwords/keys use Fernet (AES-128)
2. **Encrypted in Transit**: HTTPS/TLS 1.3 (Let's Encrypt certs)
3. **SQL Injection Protection**: SQLAlchemy ORM parameterized queries
4. **XSS Protection**: React auto-escaping, CSP headers

### Audit Trail

- **What**: Action name (e.g., "delete_server")
- **Who**: User ID + username
- **When**: Timestamp (UTC)
- **Where**: IP address
- **Details**: JSON blob with context (e.g., server hostname)

---

## Deployment Modes

### 1. Cloud SaaS (Docker)

**Recommended for**: Teams, production environments

```yaml
# docker-compose.yml
services:
  nginx:       # SSL termination, reverse proxy
  backend:     # FastAPI (auto-restarts on code change in dev)
  frontend:    # Next.js (static build served by Nginx)
  db:          # PostgreSQL + pgvector
```

**Startup**:

```bash
docker-compose up -d
```

**Updates**: `git pull && docker-compose up -d --build`

### 2. Desktop Local (SQLite)

**Recommended for**: Individual users, offline scenarios

1. Set `DESKTOP_MODE=true` in `.env`
2. Backend uses SQLite (`~/.local/share/ai-sysadmin-agent/database.db`)
3. Desktop app connects to `localhost:8000`

**Startup**:

```bash
cd backend && uvicorn main:app --reload
cd frontend-desktop && npm run tauri dev
```

### 3. Hybrid (Desktop + Cloud Backend)

**Recommended for**: Mobile usage, consistency across devices

- Desktop app installed locally
- Connects to cloud backend (`https://yourdomain.com/api/v1`)
- Shared data across all devices

**Configuration**: Set `VITE_API_URL=https://yourdomain.com/api/v1` in desktop build

---

## Appendix: Related Documentation

- **[Developer Guide](DEVELOPER_GUIDE.md)**: Setup, development workflow
- **[RBAC Documentation](RBAC.md)**: Detailed permission matrix
- **[Audit System](AUDIT_SYSTEM_ARCHITECTURE.md)**: Logging implementation
- **[API Reference](API_REFERENCE.md)**: Endpoint specifications
- **[Production Guide](PRODUCTION_GUIDE.md)**: Deployment best practices

---

**Document Owner**: Development Team  
**Last Reviewed**: 2026-01-17
