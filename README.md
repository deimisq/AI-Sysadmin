# 🤖 AI Sysadmin Agent

**Intelligent Server Management & Automation Platform**

[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0--RC-green.svg)](VERSION.json)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![Status](https://img.shields.io/badge/status-stable-green.svg)](docs/planning/ROADMAP.md)

> 🚀 **v1.0.0 Release Candidate** - Complete Feature Parity achieved between Desktop and Web.

## 🌟 Overview

AI Sysadmin Agent is an advanced platform for intelligent server management, diagnostics, and automation powered by AI.

### 🖥️ Deployment Modes

- **☁️ SaaS / Cloud (Docker)**: Deploy continuously using Docker. Ideal for teams.
- **💻 Desktop Application**: Native Windows/Linux/Mac app (Tauri).
  - Connects to your Cloud Backend or runs locally.
  - Native experience with system notifications.

### ✨ Key Features (v1.0)

- 🛡️ **Full Audit Logging**: Traceability of all critical actions (Login, Create, Delete, Execute).
- 🤖 **AI-Powered Diagnostics**: Detect and resolve issues using Gemini, Bedrock, or OpenAI.
- 🔐 **Enterprise Security**: Role-Based Access Control (RBAC) and encrypted storage.
- 📊 **Multi-Server Management**: Centralized command center.
- 🌐 **Multi-Language**: Native English and Spanish support.
- 🎨 **Modern UI**: Dark/Light mode, responsive design.

## 📦 Repository Structure

- `backend/`: **FastAPI (Python)** application. Handles logic, DB, and AI.
- `frontend/`: **Next.js** Web Application & **Tauri** Desktop Core.
- `docs/`: Complete project documentation.

## 📚 Documentation Index

We have organized our documentation to help you find what you need quickly.

### 🏗️ Architecture & Design

*Located in [docs/architecture/](docs/architecture/)*

- **[System Architecture](docs/architecture/AUDIT_SYSTEM_ARCHITECTURE.md)**: Overview of the audit system and core components.
- **[Zero Knowledge Vault](docs/architecture/DESIGN_ZERO_KNOWLEDGE_VAULT.md)**: Security design for credential storage.
- **[Authentication](docs/architecture/AUTHENTICATION.md)**: Auth flows and mechanisms.
- **[RBAC](docs/architecture/RBAC.md) / [Permissions](docs/architecture/ROLES_AND_PERMISSIONS.md)**: Role-Based Access Control details.
- **[Multi-Tenancy](docs/architecture/MULTI_TENANCY_IMPLEMENTATION.md)**: How data isolation works.

### 📖 User & Developer Guides

*Located in [docs/guides/](docs/guides/)*

- **[Quick Start (Desktop)](docs/guides/QUICKSTART_DESKTOP.md)**: Get up and running with the desktop app.
- **[Windows Guide](docs/guides/WINDOWS_START_HERE.md)**: Specific instructions for Windows users.
- **[Production Guide](docs/guides/PRODUCTION_GUIDE.md)**: Deploying to production environments.
- **[Developer Guide](docs/guides/DEVELOPER_GUIDE.md)**: Setup for contributors and developers.
- **[Testing Guide](docs/guides/WINDOWS_TESTING_GUIDE.md)**: How to run tests.

### 🔧 Reference

*Located in [docs/reference/](docs/reference/)*

- **[API Reference](docs/reference/API_REFERENCE.md)**: Backend API documentation.
- **[Roles Quick Reference](docs/reference/ROLES_QUICK_REFERENCE.md)**: Cheat sheet for user roles.

### 📅 Planning & Roadmap

*Located in [docs/planning/](docs/planning/)*

- **[Roadmap](docs/planning/ROADMAP.md)**: Future plans and features.
- **[Phase 1 Progress](docs/planning/PHASE1_PROGRESS.md)**: Status of initial phase.
- **[Multi-Tenancy Plan](docs/planning/PHASE2_MULTITENANCY.md)**: Phase 2 details.

### 🛠️ Troubleshooting

*Located in [docs/troubleshooting/](docs/troubleshooting/)*

- **[Installer Troubleshooting](docs/troubleshooting/INSTALLER_TROUBLESHOOTING.md)**: Help with installation issues.
- **[Troubleshooting Report](docs/troubleshooting/TROUBLESHOOTING_REPORT.md)**: Common problems and fixes.

### 📦 Releases

*Located in [docs/releases/](docs/releases/)*

- **[Changelog](docs/releases/CHANGELOG.md)**: History of changes.
- **[Release Process](docs/releases/RELEASE_PROCESS.md)**: How we ship updates.

### 🏗️ Build Instructions

*Located in [docs/build/](docs/build/)*

- **[Backend Build](docs/build/BACKEND_BUILD.md)**: How to compile the Python backend.
- **[Desktop Build](docs/build/BUILD_DESKTOP_SIMPLE.md)**: Simple guide for desktop builds.

## 🚀 Quick Start (Docker)

To run the full stack locally:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Access the application at `http://localhost:3000`.

## ⚖️ License

Copyright © 2024 Sentrait. All rights reserved.
See [LICENSE](LICENSE) for full terms.
