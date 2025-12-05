# 📋 Technical Requirements

This document outlines the software, hardware, and network requirements for running the **AI Sysadmin Agent** with its complete admin panel and all features.

## 🖥️ System Requirements

### Hardware (Minimum)
-   **CPU**: 2 vCPUs (4 vCPUs recommended for production)
-   **RAM**: 4 GB (8 GB recommended for better performance with Docker)
-   **Disk**: 20 GB SSD (50 GB recommended for logs and database growth)

### Hardware (Recommended for Production)
-   **CPU**: 4+ vCPUs
-   **RAM**: 16 GB
-   **Disk**: 100 GB SSD
-   **Network**: 1 Gbps

### Operating System
-   **Linux**: Ubuntu 20.04/22.04 LTS (Recommended)
-   **macOS**: Sonoma or later
-   **Windows**: WSL2 (Ubuntu distro)

## 🛠️ Software Dependencies

The project is containerized, so the only **strict requirements** on the host machine are:

-   **Docker Engine**: Version 24.0+
-   **Docker Compose**: Version 2.0+
-   **Git**

*Note: Python and Node.js are NOT required on the host machine to run the application, as they run inside containers. However, having them installed is useful for IDE autocompletion.*

### Containerized Environment (Managed by Docker)
-   **Backend**: Python 3.11-slim
-   **Frontend**: Node.js 18-alpine
-   **Database**: PostgreSQL 16 with pgvector extension
-   **Reverse Proxy**: Nginx Alpine

### AI & Cloud Services

You must have access to **ONE** of the following LLM providers (configurable dynamically from admin panel):

1.  **Amazon Bedrock (Recommended)**
    -   **AWS Account** with Bedrock access enabled
    -   **Models Enabled**:
        -   `anthropic.claude-3-5-sonnet-20240620-v1:0` (Reasoning)
        -   `amazon.titan-embed-text-v1` (Embeddings)
    -   **Credentials**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or IAM Role), and `AWS_REGION`

2.  **Google Gemini**
    -   **Google Cloud Project** with Vertex AI or Gemini API enabled
    -   **Model**: `gemini-2.0-flash-exp`
    -   **API Key**

3.  **OpenAI**
    -   **API Key** with access to GPT-4o
    -   **Model**: `gpt-4o`

**Note**: AI provider configuration can be changed dynamically from the admin panel without restarting the backend.

### Email Service (Optional but Recommended)

For email notifications and test emails:
-   **SMTP Server** access (Gmail, Office 365, SendGrid, Mailgun, etc.)
-   **Credentials**: SMTP username and password/app password
-   **Port**: Typically 587 (TLS) or 465 (SSL)

## 🌐 Network Requirements

### Inbound
-   **Port 80** (HTTP) - For web interface
-   **Port 443** (HTTPS) - For secure web interface (recommended for production)

### Outbound
-   **Port 443** (HTTPS) - For AI API calls (Bedrock, Gemini, OpenAI)
-   **Port 22** (SSH) - For connecting to managed servers
-   **Port 587/465** (SMTP) - For sending email notifications
-   **Port 5432** (PostgreSQL) - Only if using external database

### Firewall Rules
-   Allow inbound traffic on ports 80/443 from your users
-   Allow outbound traffic to:
    -   AI provider endpoints (AWS, Google, OpenAI)
    -   Managed servers (SSH port 22)
    -   SMTP servers (ports 587/465)

## 🔐 Security Requirements

### SSL/TLS Certificates (Production)
-   **Valid SSL certificate** for HTTPS
-   Can use Let's Encrypt for free certificates
-   Configure in Nginx reverse proxy

### Secrets Management
-   **Encryption Key**: 32-byte key for encrypting SSH credentials (auto-generated or provided)
-   **JWT Secret**: Strong secret key for JWT token signing
-   **Database Password**: Strong password for PostgreSQL

### Access Control
-   **Firewall**: Configure firewall rules to restrict access
-   **VPN**: Recommended for accessing admin panel in production
-   **Strong Passwords**: Enforce strong password policy for users
-   **2FA**: Consider implementing 2FA for admin accounts (future feature)

## 📊 Database Requirements

### PostgreSQL Configuration
-   **Version**: PostgreSQL 14+ (16 recommended)
-   **Extensions Required**:
    -   `pgvector` - For vector embeddings and semantic search
-   **Storage**: Minimum 10 GB, grows with:
    -   Number of servers
    -   Audit logs
    -   Knowledge base entries
    -   System configuration

### Database Sizing Guidelines
-   **Small deployment** (< 50 servers): 10 GB
-   **Medium deployment** (50-200 servers): 50 GB
-   **Large deployment** (200+ servers): 100+ GB

## 🚀 Deployment Scenarios

### Development/Testing
-   **Docker Compose** on local machine or VM
-   **Minimum requirements** sufficient
-   **HTTP** acceptable
-   **Self-signed certificates** acceptable

### Production (Small Team)
-   **Single VM** with Docker Compose
-   **Recommended hardware** specifications
-   **HTTPS** with valid certificate
-   **Regular backups** of database
-   **Monitoring** recommended

### Production (Enterprise)
-   **Kubernetes** deployment (future support)
-   **Load balancer** for high availability
-   **Separate database** server/cluster
-   **Redis** for caching (future feature)
-   **Centralized logging** (ELK stack)
-   **Monitoring** (Prometheus + Grafana)
-   **Backup strategy** with retention policy

## 📦 Storage Requirements

### Application Data
-   **Docker Images**: ~2 GB
-   **Application Code**: ~100 MB
-   **Logs**: Variable (configure rotation)

### Database Data
-   **Base installation**: ~100 MB
-   **Per server**: ~1 MB
-   **Per user**: ~10 KB
-   **Per audit log entry**: ~1 KB
-   **Per knowledge base entry**: ~10 KB

### Recommended Log Rotation
-   **Application logs**: 7 days retention
-   **Nginx logs**: 14 days retention
-   **Audit logs**: Keep indefinitely (or per compliance requirements)

## 🔧 Optional Components

### Monitoring (Recommended for Production)
-   **Prometheus**: Metrics collection
-   **Grafana**: Metrics visualization
-   **Alertmanager**: Alert routing

### Backup Solution
-   **PostgreSQL backups**: Daily automated backups
-   **Retention**: 30 days minimum
-   **Off-site storage**: S3, Azure Blob, or similar

### High Availability (Enterprise)
-   **Multiple backend instances**: Behind load balancer
-   **PostgreSQL replication**: Primary + replicas
-   **Shared storage**: For session data

## 🌍 Supported Browsers

### Frontend Compatibility
-   **Chrome**: Version 90+
-   **Firefox**: Version 88+
-   **Safari**: Version 14+
-   **Edge**: Version 90+

### Mobile Support
-   **Responsive design**: Works on tablets and phones
-   **Recommended**: Desktop/laptop for admin panel

## 📝 Environment Variables Reference

### Required Backend Variables
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY=your-jwt-secret-key
ENCRYPTION_KEY=your-32-byte-encryption-key
```

### AI Provider Variables (At least one required)
```env
# Amazon Bedrock
AWS_BEARER_TOKEN_BEDROCK=your-token
AWS_REGION=us-east-1

# Google Gemini
GOOGLE_API_KEY=your-api-key

# OpenAI
OPENAI_API_KEY=your-api-key
```

### Optional Backend Variables
```env
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
LLM_PROVIDER=bedrock
```

### Frontend Variables
```env
NEXT_PUBLIC_API_URL=/api/v1  # Relative path when behind Nginx
```

## 🔄 Update Requirements

### Application Updates
-   **Git pull**: Get latest code
-   **Docker rebuild**: `docker compose up --build -d`
-   **Database migrations**: `docker compose exec backend alembic upgrade head`

### Database Migrations
-   **Alembic**: Automatic schema migrations
-   **Backup first**: Always backup before migrating
-   **Rollback capability**: Alembic supports downgrades

## 📞 Support and Troubleshooting

### Common Issues
1.  **Port conflicts**: Ensure ports 80/443 are available
2.  **Database connection**: Check DATABASE_URL and network
3.  **AI API errors**: Verify API keys and quotas
4.  **Email not sending**: Check SMTP configuration and credentials

### Logs Location
-   **Backend logs**: `docker compose logs backend`
-   **Frontend logs**: `docker compose logs frontend`
-   **Database logs**: `docker compose logs db`
-   **Nginx logs**: `docker compose logs nginx`

### Health Checks
-   **Backend**: `curl http://localhost/api/v1/health`
-   **Frontend**: `curl http://localhost`
-   **Database**: `docker compose exec db pg_isready`

---

**For detailed deployment instructions, see the main README.md**
