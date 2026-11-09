#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Initializing license..."
python -m scripts.init_license

echo "Starting FastAPI server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
