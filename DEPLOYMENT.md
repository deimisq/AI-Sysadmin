# 🚀 AI Sysadmin Agent - Production Deployment Guide

## 📋 Overview

This guide explains how to deploy the AI Sysadmin Agent in production using pre-compiled binaries and Docker containers.

## 🔒 Security Features

- **Backend**: Pre-compiled native binary (optimized and secure)
- **Frontend**: Production-optimized standalone build
- **Containers**: Minimal runtime images (reduced attack surface)
- **Licensing**: 30-day trial + commercial activation system
- **Enterprise-Grade**: Professional deployment architecture

## 📦 Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- 10GB disk space

## 🛠️ Installation Steps

### 1. Extract Deployment Package

```bash
tar -xzf sysadmin-agent-YYYYMMDD-HHMMSS.tar.gz
cd sysadmin-agent
```

### 2. Configure Environment

```bash
cp .env.prod.template .env.prod
nano .env.prod
```

**Required Configuration:**

```env
# Database
POSTGRES_PASSWORD=<strong-password>

# Security Keys
SECRET_KEY=<generate-with-openssl-rand-hex-32>
ENCRYPTION_KEY=<generate-with-fernet>

# AI API
GEMINI_API_KEY=<your-gemini-key>
```

**Generate Keys:**

```bash
# SECRET_KEY
openssl rand -hex 32

# ENCRYPTION_KEY
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 3. Load Docker Images (if provided separately)

```bash
docker load < sysadmin-agent-images.tar.gz
```

### 4. Start Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Verify Installation

```bash
# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 6. Access Application

Open your browser and navigate to:
- **HTTP**: `http://your-server-ip`
- **HTTPS**: `https://your-domain.com` (if SSL configured)

### 7. Initial Setup

1. **Create Superuser**:
   ```bash
   docker exec -it sysadmin-backend /app/backend create-superuser
   ```

2. **Login** with the credentials you just created

3. **Trial License**: A 30-day trial license is automatically created on first startup

## 🔑 License Activation

### Trial License (30 days)

Automatically created on first startup. No action required.

### Commercial License

After purchasing a commercial license:

```bash
python3 activate_license.py YOUR-LICENSE-KEY
```

**License Key Format**: `XXXXX-XXXXX-XXXXX-XXXXX-XXXXX`

The activation script will:
1. Validate the license key
2. Contact the license server
3. Update the local database
4. Confirm activation

**Restart services after activation:**

```bash
docker-compose -f docker-compose.prod.yml restart
```

## 📊 Monitoring

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Check License Status

Navigate to: **Admin Panel → License Tab**

## 🔄 Updates

### Applying Updates

1. Stop services:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. Load new images:
   ```bash
   docker load < sysadmin-agent-images-new.tar.gz
   ```

3. Start services:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🛡️ Security Best Practices

1. **Change Default Passwords**: Always use strong, unique passwords
2. **Enable HTTPS**: Configure SSL certificates in nginx
3. **Firewall**: Only expose ports 80 and 443
4. **Backups**: Regular database backups
5. **Updates**: Keep Docker and system packages updated

## 📁 Directory Structure

```
sysadmin-agent/
├── docker-compose.prod.yml    # Production orchestration
├── docker-compose.override.yml # Image references
├── .env.prod                   # Environment configuration
├── nginx/                      # Nginx configuration
│   └── conf.d/
│       └── default.conf
├── activate_license.py         # License activation script
├── README.md                   # This file
└── VERSION.json               # Version information
```

## 🆘 Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check environment variables
docker-compose -f docker-compose.prod.yml config
```

### Database connection errors

```bash
# Verify database is healthy
docker-compose -f docker-compose.prod.yml ps postgres

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

### License activation fails

1. Check internet connection
2. Verify license key format
3. Contact support with Installation ID

## 📞 Support

- **Email**: support@yourdomain.com
- **Documentation**: https://docs.yourdomain.com
- **License Issues**: license@yourdomain.com

## 📝 License

This software is protected by copyright and licensing agreements.
Unauthorized distribution, modification, or reverse engineering is prohibited.

---

**AI Sysadmin Agent** - Intelligent Server Management
© 2024 Your Company. All rights reserved.
