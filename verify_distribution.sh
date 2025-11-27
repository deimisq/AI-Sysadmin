#!/bin/bash
echo "🔍 Verifying distribution package..."

ERRORS=0

# Check backend binary
if [ -f "backend/dist/sysadmin-agent-backend" ]; then
    echo "✅ Backend binary found"
else
    echo "❌ Backend binary MISSING"
    ERRORS=$((ERRORS+1))
fi

# Check frontend build (if applicable, though usually inside docker)
# We check if Dockerfile exists
if [ -f "Dockerfile.frontend" ]; then
    echo "✅ Dockerfile.frontend found"
else
    echo "❌ Dockerfile.frontend MISSING"
    ERRORS=$((ERRORS+1))
fi

# Check critical files
FILES=("docker-compose.prod.yml" "activate_license.py" "LICENSE" "README.md" "VERSION.json")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file found"
    else
        echo "❌ $file MISSING"
        ERRORS=$((ERRORS+1))
    fi
done

# Check for sensitive files (should NOT exist)
SENSITIVE=("backend/main.py" "frontend/src/app/page.tsx" ".env" ".env.local")
for file in "${SENSITIVE[@]}"; do
    if [ -f "$file" ]; then
        echo "❌ Sensitive file $file EXISTS (Should be removed)"
        ERRORS=$((ERRORS+1))
    else
        echo "✅ Sensitive file $file correctly removed"
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "🎉 Verification PASSED! Ready for distribution."
    exit 0
else
    echo "⚠️  Verification FAILED with $ERRORS errors."
    exit 1
fi
