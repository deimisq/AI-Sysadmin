#!/bin/bash
set -e

echo "📦 Preparing GitHub Release Package"
echo "===================================="

VERSION=${1:-"1.0.0"}
RELEASE_NAME="ai-sysadmin-agent-v${VERSION}"
RELEASE_DIR="releases/${RELEASE_NAME}"

echo "Version: ${VERSION}"
echo "Release: ${RELEASE_NAME}"
echo ""

# Create release directory
mkdir -p "${RELEASE_DIR}"

# 1. Package backend binary
echo "📦 Packaging backend binary..."
if [ -f "backend/dist/sysadmin-agent-backend" ]; then
    tar -czf "${RELEASE_DIR}/backend-binary-linux-x64.tar.gz" \
        -C backend/dist \
        sysadmin-agent-backend
    echo "✓ Backend binary packaged: backend-binary-linux-x64.tar.gz"
    ls -lh "${RELEASE_DIR}/backend-binary-linux-x64.tar.gz"
else
    echo "❌ Backend binary not found. Please compile first with ./build-backend.sh"
    exit 1
fi

# 2. Package frontend build
echo ""
echo "📦 Packaging frontend build..."
if [ -d "frontend/.next" ]; then
    tar -czf "${RELEASE_DIR}/frontend-build.tar.gz" \
        -C frontend \
        .next package.json next.config.js
    echo "✓ Frontend build packaged: frontend-build.tar.gz"
    ls -lh "${RELEASE_DIR}/frontend-build.tar.gz"
else
    echo "❌ Frontend build not found. Please build first with: cd frontend && npm run build"
    exit 1
fi

# 3. Create deployment package (without binaries)
echo ""
echo "📦 Creating deployment package..."
tar -czf "${RELEASE_DIR}/deployment-files.tar.gz" \
    --exclude='backend/dist' \
    --exclude='frontend/.next' \
    --exclude='frontend/node_modules' \
    --exclude='.git' \
    --exclude='postgres_data' \
    --exclude='venv' \
    docker-compose.prebuilt.yml \
    Dockerfile.backend.prebuilt \
    Dockerfile.frontend.prebuilt \
    .env.prod.template \
    nginx/ \
    activate_license.py \
    README.md \
    LICENSE \
    DEPLOYMENT.md \
    RUN_INSTRUCTIONS.md \
    VERSION.json

echo "✓ Deployment files packaged: deployment-files.tar.gz"
ls -lh "${RELEASE_DIR}/deployment-files.tar.gz"

# 4. Create checksums
echo ""
echo "🔐 Generating checksums..."
cd "${RELEASE_DIR}"
sha256sum *.tar.gz > SHA256SUMS
echo "✓ Checksums generated"
cat SHA256SUMS

# 5. Create release notes
cd ../..
cat > "${RELEASE_DIR}/RELEASE_NOTES.md" << EOF
# AI Sysadmin Agent v${VERSION}

## 📦 Release Files

### For Quick Deployment (Recommended)
1. **backend-binary-linux-x64.tar.gz** - Pre-compiled backend binary (Linux x64)
2. **frontend-build.tar.gz** - Pre-built frontend
3. **deployment-files.tar.gz** - Configuration and deployment files

### Installation Steps

\`\`\`bash
# 1. Download all three files
wget https://github.com/sentrait/ai_agent/releases/download/v${VERSION}/backend-binary-linux-x64.tar.gz
wget https://github.com/sentrait/ai_agent/releases/download/v${VERSION}/frontend-build.tar.gz
wget https://github.com/sentrait/ai_agent/releases/download/v${VERSION}/deployment-files.tar.gz

# 2. Extract deployment files
tar -xzf deployment-files.tar.gz

# 3. Extract backend binary
mkdir -p backend/dist
tar -xzf backend-binary-linux-x64.tar.gz -C backend/dist/

# 4. Extract frontend build
mkdir -p frontend
tar -xzf frontend-build.tar.gz -C frontend/

# 5. Configure environment
cp .env.prod.template .env.prod
nano .env.prod  # Edit with your values

# 6. Deploy with Docker
docker-compose -f docker-compose.prebuilt.yml up -d
\`\`\`

## ✨ Features

- 🤖 AI-powered server diagnostics and management
- 🔐 Role-based access control (RBAC)
- 🌐 Multi-language support (EN/ES)
- 🎨 Modern UI with dark mode
- 📊 Real-time monitoring
- 🔑 30-day trial license (automatic)
- 🛡️ Enterprise-grade security

## 🔒 Security

- Backend compiled to native binary (source code protected)
- Frontend optimized and minified
- Distroless Docker containers
- License-based access control

## 📝 License

- **Trial**: 30 days free (automatic on first start)
- **Commercial**: Contact sales@yourdomain.com

## 🆘 Support

- Documentation: See DEPLOYMENT.md and RUN_INSTRUCTIONS.md
- Email: support@yourdomain.com
- Issues: https://github.com/sentrait/ai_agent/issues

## 🔐 Checksums

See SHA256SUMS file for integrity verification.

---

© 2024 Your Company. All rights reserved.
EOF

echo ""
echo "✓ Release notes created"

# Summary
echo ""
echo "===================================="
echo "✅ Release package ready!"
echo ""
echo "Location: ${RELEASE_DIR}/"
echo ""
echo "Files:"
ls -lh "${RELEASE_DIR}/"
echo ""
echo "Next steps:"
echo "1. Create a new release on GitHub"
echo "2. Upload these files as release assets"
echo "3. Copy RELEASE_NOTES.md content to release description"
echo ""
echo "GitHub CLI command:"
echo "gh release create v${VERSION} \\"
echo "  ${RELEASE_DIR}/*.tar.gz \\"
echo "  ${RELEASE_DIR}/SHA256SUMS \\"
echo "  --title 'AI Sysadmin Agent v${VERSION}' \\"
echo "  --notes-file ${RELEASE_DIR}/RELEASE_NOTES.md"
echo ""
