#!/bin/bash
set -e

echo "🧹 Cleaning repository for public distribution..."
echo "=================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Confirmation
echo -e "${YELLOW}⚠️  WARNING: This will remove source code and sensitive files${NC}"
echo -e "${YELLOW}⚠️  Only compiled binaries and deployment files will remain${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "📁 Removing source code..."

# Remove backend source code (keep only compiled binary and essential configs)
find backend -name "*.py" -type f ! -name "__init__.py" -delete
find backend -name "*.pyc" -delete
find backend -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find backend -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true

echo -e "${GREEN}✓${NC} Backend source code removed"

# Remove frontend source code (keep only build configs)
if [ -d "frontend/src" ]; then
    rm -rf frontend/src
    echo -e "${GREEN}✓${NC} Frontend src/ removed"
fi

if [ -d "frontend/app" ]; then
    rm -rf frontend/app
    echo -e "${GREEN}✓${NC} Frontend app/ removed"
fi

if [ -d "frontend/components" ]; then
    rm -rf frontend/components
    echo -e "${GREEN}✓${NC} Frontend components/ removed"
fi

if [ -d "frontend/public" ]; then
    rm -rf frontend/public
    echo -e "${GREEN}✓${NC} Frontend public/ removed"
fi

if [ -d "frontend/messages" ]; then
    rm -rf frontend/messages
    echo -e "${GREEN}✓${NC} Frontend messages/ removed"
fi

if [ -d "frontend/lib" ]; then
    rm -rf frontend/lib
    echo -e "${GREEN}✓${NC} Frontend lib/ removed"
fi

# Remove sensitive documentation
echo ""
echo "📄 Removing sensitive documentation..."

if [ -f "README.md" ]; then
    rm README.md
    echo -e "${GREEN}✓${NC} README.md removed"
fi

if [ -f "CHANGELOG.md" ]; then
    rm CHANGELOG.md
    echo -e "${GREEN}✓${NC} CHANGELOG.md removed"
fi

if [ -f "VERSION_HISTORY.md" ]; then
    rm VERSION_HISTORY.md
    echo -e "${GREEN}✓${NC} VERSION_HISTORY.md removed"
fi

# Rename public README
if [ -f "PUBLIC_README.md" ]; then
    mv PUBLIC_README.md README.md
    echo -e "${GREEN}✓${NC} PUBLIC_README.md → README.md"
fi

# Remove development files
echo ""
echo "🗑️  Removing development files..."

rm -rf .vscode .idea *.swp *.swo 2>/dev/null || true
rm -rf node_modules .next out 2>/dev/null || true
rm -rf postgres_data logs 2>/dev/null || true
rm -f .env .env.local .env.development .env.test 2>/dev/null || true
rm -f docker-compose.override.yml 2>/dev/null || true

echo -e "${GREEN}✓${NC} Development files removed"

# Remove git history (optional - creates fresh repo)
if [ "$1" == "--reset-git" ]; then
    echo ""
    echo "🔄 Resetting git history..."
    rm -rf .git
    git init
    git add .
    git commit -m "Initial public release"
    echo -e "${GREEN}✓${NC} Git history reset"
fi

# Create distribution marker
echo ""
echo "📝 Creating distribution marker..."
cat > .distribution <<EOF
AI Sysadmin Agent - Public Distribution
Generated: $(date)
Type: Commercial Binary Distribution
Source Code: Not Included
EOF

echo -e "${GREEN}✓${NC} Distribution marker created"

# Summary
echo ""
echo "=================================================="
echo -e "${GREEN}✅ Repository cleaned successfully!${NC}"
echo ""
echo "Remaining files:"
echo "  ✓ Compiled binaries"
echo "  ✓ Docker configuration"
echo "  ✓ Deployment scripts"
echo "  ✓ Public documentation"
echo "  ✓ License files"
echo ""
echo "Removed:"
echo "  ✗ Backend source code (.py files)"
echo "  ✗ Frontend source code (src/, app/, components/)"
echo "  ✗ Sensitive documentation"
echo "  ✗ Development files"
echo ""
echo "Next steps:"
echo "1. Review remaining files"
echo "2. Test deployment with docker-compose.prod.yml"
echo "3. Push to public repository"
echo ""
