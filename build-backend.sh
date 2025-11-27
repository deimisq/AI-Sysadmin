#!/bin/bash
set -e

echo "🔨 Compiling Backend with Nuitka..."

# Install Nuitka if not present
pip install nuitka ordered-set zstandard --break-system-packages
pip install -r backend/requirements.txt --break-system-packages
pip install google-generativeai --break-system-packages

# Clean previous builds
rm -rf backend/build backend/dist backend/*.bin backend/*.so

# Compile main.py to binary
python3 -m nuitka \
    --standalone \
    --onefile \
    --follow-imports \
    --include-package=fastapi \
    --include-package=uvicorn \
    --include-package=sqlalchemy \
    --include-package=pydantic \
    --include-package=jose \
    --include-package=passlib \
    --include-package=httpx \
    --include-package=ansible \
    --include-package=google.generativeai \
    --include-module=routers \
    --include-module=models \
    --include-module=schemas \
    --include-module=database \
    --include-module=dependencies \
    --include-module=settings \
    --include-module=utils \
    --include-module=services \
    --include-module=middleware \
    --include-data-dir=backend/alembic=alembic \
    --output-dir=backend/dist \
    --output-filename=sysadmin-agent-backend \
    backend/main.py

echo "✅ Backend compiled successfully!"
echo "📦 Binary location: backend/dist/sysadmin-agent-backend"
