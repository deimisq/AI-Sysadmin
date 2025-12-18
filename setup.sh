#!/bin/bash

# Redireccionar al script de configuración en el directorio scripts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/scripts/setup.sh" "$@"
