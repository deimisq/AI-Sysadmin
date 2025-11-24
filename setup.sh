#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   🤖 AI Sysadmin Agent - Interactive Setup & Deployment      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 1. Check Dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC} Please install Docker first."
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is not installed.${NC} Please install Git first."
    exit 1
fi

echo -e "${GREEN}Dependencies OK.${NC}"
echo ""

# 2. Configuration
echo -e "${YELLOW}Configuration Setup${NC}"
echo "We will now configure the environment variables."
echo ""

# Backend .env
BACKEND_ENV="backend/.env"
if [ -f "$BACKEND_ENV" ]; then
    read -p "backend/.env already exists. Overwrite? (y/N): " overwrite
    if [[ $overwrite =~ ^[Yy]$ ]]; then
        rm "$BACKEND_ENV"
    fi
fi

if [ ! -f "$BACKEND_ENV" ]; then
    echo -e "${BLUE}Configuring Backend...${NC}"
    
    # Database
    read -p "Database Name [sysadmin_agent_db]: " DB_NAME
    DB_NAME=${DB_NAME:-sysadmin_agent_db}
    
    read -p "Database User [sysadmin_agent]: " DB_USER
    DB_USER=${DB_USER:-sysadmin_agent}
    
    read -s -p "Database Password [secure_password_dev]: " DB_PASS
    DB_PASS=${DB_PASS:-secure_password_dev}
    echo ""
    
    # Security
    SECRET_KEY=$(openssl rand -hex 32)
    echo "Generated Secret Key: $SECRET_KEY"
    
    # AI Provider
    echo ""
    echo "Select AI Provider:"
    echo "1) Amazon Bedrock (Recommended)"
    echo "2) Google Gemini"
    echo "3) OpenAI"
    read -p "Choice [1]: " AI_CHOICE
    AI_CHOICE=${AI_CHOICE:-1}
    
    if [ "$AI_CHOICE" == "1" ]; then
        PROVIDER="bedrock"
        read -p "AWS Region [us-east-1]: " AWS_REGION
        AWS_REGION=${AWS_REGION:-us-east-1}
        read -s -p "AWS Access Key ID: " AWS_KEY
        echo ""
        read -s -p "AWS Secret Access Key: " AWS_SECRET
        echo ""
        # Note: In a real scenario we might use IAM roles, but for .env we stick to keys or token
        # The current backend uses AWS_BEARER_TOKEN_BEDROCK or standard AWS env vars.
        # Let's assume standard AWS env vars for boto3
    elif [ "$AI_CHOICE" == "2" ]; then
        PROVIDER="gemini"
        read -s -p "Google API Key: " GOOGLE_KEY
        echo ""
    else
        PROVIDER="openai"
        read -s -p "OpenAI API Key: " OPENAI_KEY
        echo ""
    fi
    
    # Write backend .env
    cat > "$BACKEND_ENV" <<EOL
# Database
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}

# Security
SECRET_KEY=${SECRET_KEY}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Provider
LLM_PROVIDER=${PROVIDER}
AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=${AWS_KEY}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET}
GOOGLE_API_KEY=${GOOGLE_KEY}
OPENAI_API_KEY=${OPENAI_KEY}
EOL
    echo -e "${GREEN}backend/.env created.${NC}"
else
    echo "Skipping backend configuration."
fi

echo ""

# Frontend .env
FRONTEND_ENV="frontend/.env.local"
if [ ! -f "$FRONTEND_ENV" ]; then
    echo -e "${BLUE}Configuring Frontend...${NC}"
    # Detect public IP or domain
    DEFAULT_URL="https://testing.sentrait.com.uy/api/v1"
    read -p "API URL (Client-side) [$DEFAULT_URL]: " API_URL
    API_URL=${API_URL:-$DEFAULT_URL}
    
    cat > "$FRONTEND_ENV" <<EOL
NEXT_PUBLIC_API_URL=${API_URL}
EOL
    echo -e "${GREEN}frontend/.env.local created.${NC}"
else
    echo "Skipping frontend configuration."
fi

echo ""

# 3. Deployment
echo -e "${YELLOW}Deployment${NC}"
read -p "Do you want to build and start the containers now? (Y/n): " start_containers
if [[ ! $start_containers =~ ^[Nn]$ ]]; then
    echo -e "${BLUE}Building and starting containers...${NC}"
    sudo docker compose up --build -d
    
    echo -e "${BLUE}Waiting for services to be ready...${NC}"
    sleep 10
    
    # 4. Database Setup
    echo -e "${YELLOW}Running Database Migrations...${NC}"
    sudo docker compose exec backend alembic upgrade head
    
    # 5. Superuser Creation
    echo ""
    echo -e "${YELLOW}Create Superuser Account${NC}"
    read -p "Create superuser? (Y/n): " create_admin
    if [[ ! $create_admin =~ ^[Nn]$ ]]; then
        read -p "Email: " ADMIN_EMAIL
        read -p "Username: " ADMIN_USER
        read -s -p "Password: " ADMIN_PASS
        echo ""
        read -p "Full Name: " ADMIN_NAME
        
        echo -e "${BLUE}Creating superuser...${NC}"
        sudo docker compose exec backend python create_superuser.py "$ADMIN_EMAIL" "$ADMIN_USER" "$ADMIN_PASS" "$ADMIN_NAME"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Deployment Complete!${NC}"
    echo ""
    echo "Access the application at:"
    echo "Frontend: https://testing.sentrait.com.uy (or configured domain)"
    echo "Backend API: https://testing.sentrait.com.uy/api/v1/docs"
else
    echo "Deployment skipped. You can run 'sudo docker compose up --build -d' manually."
fi
