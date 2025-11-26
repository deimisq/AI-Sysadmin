#!/bin/bash
set -e

echo "🚀 Building AI Sysadmin Agent for Production"
echo "=============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo -e "${RED}❌ Error: .env.prod file not found${NC}"
    echo "Please create .env.prod with required environment variables"
    exit 1
fi

# Load environment variables
export $(cat .env.prod | grep -v '^#' | xargs)

echo -e "${GREEN}✓${NC} Environment variables loaded"

# Check required variables
REQUIRED_VARS=("POSTGRES_PASSWORD" "SECRET_KEY" "ENCRYPTION_KEY" "GEMINI_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: $var is not set in .env.prod${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓${NC} Required variables validated"

# Build backend
echo ""
echo "📦 Building Backend (Nuitka compilation)..."
docker build -f Dockerfile.backend -t sysadmin-agent-backend:latest .
echo -e "${GREEN}✓${NC} Backend built successfully"

# Build frontend
echo ""
echo "🎨 Building Frontend (Next.js standalone)..."
docker build -f Dockerfile.frontend -t sysadmin-agent-frontend:latest .
echo -e "${GREEN}✓${NC} Frontend built successfully"

# Create docker-compose override for production
echo ""
echo "⚙️  Generating production configuration..."
cat > docker-compose.override.yml <<EOF
version: '3.8'

services:
  backend:
    image: sysadmin-agent-backend:latest
  
  frontend:
    image: sysadmin-agent-frontend:latest
EOF

echo -e "${GREEN}✓${NC} Production configuration generated"

# Create deployment package
echo ""
echo "📦 Creating deployment package..."
PACKAGE_NAME="sysadmin-agent-$(date +%Y%m%d-%H%M%S).tar.gz"

tar -czf "$PACKAGE_NAME" \
    docker-compose.prod.yml \
    docker-compose.override.yml \
    .env.prod \
    nginx/ \
    activate_license.py \
    README.md \
    VERSION.json

echo -e "${GREEN}✓${NC} Deployment package created: $PACKAGE_NAME"

# Save images to tar (optional, for offline distribution)
if [ "$1" == "--export-images" ]; then
    echo ""
    echo "💾 Exporting Docker images..."
    docker save sysadmin-agent-backend:latest sysadmin-agent-frontend:latest | gzip > sysadmin-agent-images.tar.gz
    echo -e "${GREEN}✓${NC} Images exported: sysadmin-agent-images.tar.gz"
fi

echo ""
echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Transfer $PACKAGE_NAME to target server"
echo "2. Extract: tar -xzf $PACKAGE_NAME"
echo "3. Load images (if exported): docker load < sysadmin-agent-images.tar.gz"
echo "4. Start services: docker-compose -f docker-compose.prod.yml up -d"
echo "5. Activate license: python3 activate_license.py YOUR-LICENSE-KEY"
echo ""
