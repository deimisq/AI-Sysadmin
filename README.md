# AI Sysadmin Agent

Un agente de inteligencia artificial diseñado para diagnosticar, proponer y ejecutar soluciones a problemas de infraestructura de forma autónoma (con supervisión humana).

## 🚀 Características

- **Diagnóstico Inteligente**: Utiliza LLMs (OpenAI GPT-4) y RAG (Retrieval-Augmented Generation) para analizar problemas basándose en el historial de soluciones exitosas.
- **Ejecución Segura**: Integra **Ansible** para ejecutar comandos y playbooks de forma estructurada y segura.
- **Memoria Vectorial**: Almacena problemas y soluciones en **PostgreSQL + pgvector** para aprender de experiencias pasadas.
- **API REST**: Backend en **FastAPI** listo para integrarse con **n8n** u otros orquestadores.
- **Frontend Moderno**: Interfaz en **Next.js** (en desarrollo).

## 🛠️ Stack Tecnológico

- **Backend**: Python, FastAPI, LangChain, Ansible Runner.
- **Base de Datos**: PostgreSQL, pgvector.
- **Frontend**: Next.js, Tailwind CSS.
- **Infraestructura**: Docker, Docker Compose.

## 📋 Requisitos Previos

Consulta el archivo [technical_requirements.md](./technical_requirements.md) para una lista detallada de requisitos de software y red.

## ⚡ Inicio Rápido

1.  **Clonar el repositorio**:
    ```bash
    git clone https://github.com/sentrait/ai_agent.git
    cd ai_agent
    ```

2.  **Configurar Variables de Entorno**:
    Crea un archivo `.env` en la carpeta `backend/` con tus credenciales (ver `technical_requirements.md`).

3.  **Iniciar con Docker Compose**:
    ```bash
    sudo docker compose up -d db
    ```

4.  **Instalar Dependencias y Migrar BD**:
    ```bash
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    alembic upgrade head
    ```

5.  **Ejecutar Backend**:
    ```bash
    uvicorn main:app --reload --host 0.0.0.0
    ```

## 📚 Documentación

- [Requerimientos Técnicos](./technical_requirements.md)
- [Plan de Implementación](./implementation_plan.md)
