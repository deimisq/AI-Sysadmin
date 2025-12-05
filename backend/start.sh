#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Initializing license..."
python init_license.py

echo "Starting FastAPI server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
