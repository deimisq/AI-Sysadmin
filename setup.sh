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

echo -e "${GREEN}✓ Dependencies OK.${NC}"
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
    echo -e "${BLUE}Generating security keys...${NC}"
    SECRET_KEY=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -base64 32)
    echo -e "${GREEN}✓ Security keys generated${NC}"
    
    # AI Provider
    echo ""
    echo "Select AI Provider:"
    echo "1) Amazon Bedrock (Claude 3.5 Sonnet - Recommended)"
    echo "2) Google Gemini 2.0 Flash"
    echo "3) OpenAI GPT-4o"
    read -p "Choice [1]: " AI_CHOICE
    AI_CHOICE=${AI_CHOICE:-1}
    
    AWS_REGION=""
    AWS_KEY=""
    AWS_SECRET=""
    GOOGLE_KEY=""
    OPENAI_KEY=""
    
    if [ "$AI_CHOICE" == "1" ]; then
        PROVIDER="bedrock"
        read -p "AWS Region [us-east-1]: " AWS_REGION
        AWS_REGION=${AWS_REGION:-us-east-1}
        read -s -p "AWS Access Key ID: " AWS_KEY
        echo ""
        read -s -p "AWS Secret Access Key: " AWS_SECRET
        echo ""
    elif [ "$AI_CHOICE" == "2" ]; then
        PROVIDER="gemini"
        read -s -p "Google API Key: " GOOGLE_KEY
        echo ""
    else
        PROVIDER="openai"
        read -s -p "OpenAI API Key: " OPENAI_KEY
        echo ""
    fi
    
    # SMTP Configuration (Optional)
    echo ""
    echo -e "${YELLOW}SMTP Configuration (Optional - for email notifications)${NC}"
    read -p "Configure SMTP now? (y/N): " configure_smtp
    
    SMTP_HOST=""
    SMTP_PORT="587"
    SMTP_USER=""
    SMTP_PASS=""
    SMTP_FROM=""
    
    if [[ $configure_smtp =~ ^[Yy]$ ]]; then
        read -p "SMTP Host (e.g., smtp.gmail.com): " SMTP_HOST
        read -p "SMTP Port [587]: " SMTP_PORT_INPUT
        SMTP_PORT=${SMTP_PORT_INPUT:-587}
        read -p "SMTP Username: " SMTP_USER
        read -s -p "SMTP Password: " SMTP_PASS
        echo ""
        read -p "From Email Address: " SMTP_FROM
    fi
    
    # Write backend .env
    cat > "$BACKEND_ENV" <<EOL
# Database
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}

# Security
SECRET_KEY=${SECRET_KEY}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Encryption (for SSH credentials)
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# AI Provider
LLM_PROVIDER=${PROVIDER}
AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=${AWS_KEY}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET}
GOOGLE_API_KEY=${GOOGLE_KEY}
OPENAI_API_KEY=${OPENAI_KEY}

# SMTP Configuration (Optional)
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASS}
SMTP_FROM=${SMTP_FROM}
SMTP_USE_TLS=true

# CORS (Optional - for production)
CORS_ORIGINS=*
EOL
    echo -e "${GREEN}✓ backend/.env created.${NC}"
else
    echo "Skipping backend configuration (file exists)."
fi

echo ""

# Frontend .env
FRONTEND_ENV="frontend/.env.local"
if [ ! -f "$FRONTEND_ENV" ]; then
    echo -e "${BLUE}Configuring Frontend...${NC}"
    echo "For local development, leave blank to use default (http://localhost:8000/api/v1)"
    echo "For production, enter your domain (e.g., https://yourdomain.com/api/v1)"
    read -p "API URL (leave blank for local): " API_URL
    
    if [ -z "$API_URL" ]; then
        cat > "$FRONTEND_ENV" <<EOL
# Leave empty for local development
# NEXT_PUBLIC_API_URL=
EOL
    else
        cat > "$FRONTEND_ENV" <<EOL
NEXT_PUBLIC_API_URL=${API_URL}
EOL
    fi
    echo -e "${GREEN}✓ frontend/.env.local created.${NC}"
else
    echo "Skipping frontend configuration (file exists)."
fi

echo ""

# 3. Deployment
echo -e "${YELLOW}Deployment${NC}"
read -p "Do you want to build and start the containers now? (Y/n): " start_containers
if [[ ! $start_containers =~ ^[Nn]$ ]]; then
    echo -e "${BLUE}Building and starting containers...${NC}"
    sudo docker compose up --build -d
    
    echo -e "${BLUE}Waiting for services to be ready...${NC}"
    sleep 15
    
    # 4. Database Setup
    echo -e "${YELLOW}Running Database Migrations...${NC}"
    sudo docker compose exec backend alembic upgrade head
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database migrations completed${NC}"
    else
        echo -e "${RED}✗ Database migrations failed${NC}"
        exit 1
    fi
    
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
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Superuser created successfully${NC}"
        else
            echo -e "${RED}✗ Superuser creation failed${NC}"
        fi
    fi
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║              ✅ Deployment Complete!                          ║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Access the application at:${NC}"
    echo "  • Frontend:     http://localhost"
    echo "  • Backend API:  http://localhost/api/v1"
    echo "  • API Docs:     http://localhost/api/v1/docs"
    echo "  • Admin Panel:  http://localhost/admin"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Login with your superuser credentials"
    echo "  2. Configure AI parameters in Admin Panel > AI Parameters"
    echo "  3. Add your first server in the Dashboard"
    echo "  4. Start diagnosing!"
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  • View logs:    sudo docker compose logs -f"
    echo "  • Stop:         sudo docker compose down"
    echo "  • Restart:      sudo docker compose restart"
    echo ""
else
    echo "Deployment skipped. You can run 'sudo docker compose up --build -d' manually."
fi
