# 🤖 AI Sysadmin Agent

**Intelligent Server Management & Automation Platform**

[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.9.4--beta-orange.svg)](VERSION.json)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.prod.yml)
[![Status](https://img.shields.io/badge/status-beta-yellow.svg)](ROADMAP.md)

> ⚠️ **VERSIÓN BETA** - Esta es una versión en desarrollo activo. La API puede cambiar antes de la versión 1.0.0 estable. Ver [ROADMAP](ROADMAP.md) para el plan hacia 1.0.0.

## 🌟 Overview

AI Sysadmin Agent es una plataforma de gestión inteligente de servidores, diagnósticos y automatización impulsada por tecnología de IA avanzada.

### 🖥️ Disponible en Dos Versiones

- **☁️ SaaS / Web Application**: Despliega en tu servidor con Docker (este repositorio)
- **💻 Desktop Application**: Aplicación de escritorio nativa para Windows (🆕 En desarrollo)
  - Ver [QUICKSTART_DESKTOP.md](QUICKSTART_DESKTOP.md) para inicio rápido
  - Ver [frontend/DESKTOP_README.md](frontend/DESKTOP_README.md) para documentación completa

### Key Features

- 🤖 **AI-Powered Diagnostics**: Detección y resolución inteligente de problemas
- 🔐 **Secure Architecture**: Seguridad empresarial con control de acceso basado en roles
- 📊 **Multi-Server Management**: Control centralizado de toda tu infraestructura
- 🌐 **Multi-Language Support**: Interfaces en inglés y español
- 🎨 **Modern UI**: Interfaz hermosa y responsive con modo oscuro

## 📦 What's Included

This repository contains the **production-ready distribution** of AI Sysadmin Agent:

- ✅ Compiled backend binary (no source code)
- ✅ Optimized frontend build
- ✅ Docker deployment configuration
- ✅ License activation system
- ✅ Complete deployment documentation

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- 10GB disk space

### Installation

**📦 Download Pre-compiled Binaries**

Binaries are distributed via [GitHub Releases](https://github.com/sentrait/ai_agent_public/releases/latest) to avoid repository size limits.

1. **Download the latest release**:

   ```bash
   # Download all required files
   wget https://github.com/sentrait/ai_agent_public/releases/download/v1.0.0/backend-binary-linux-x64.tar.gz
   wget https://github.com/sentrait/ai_agent_public/releases/download/v1.0.0/frontend-build.tar.gz
   wget https://github.com/sentrait/ai_agent_public/releases/download/v1.0.0/deployment-files.tar.gz
   wget https://github.com/sentrait/ai_agent_public/releases/download/v1.0.0/SHA256SUMS
   
   # Verify integrity
   sha256sum -c SHA256SUMS
   ```

2. **Extract files**:

   ```bash
   # Extract deployment configuration
   tar -xzf deployment-files.tar.gz
   
   # Extract backend binary
   mkdir -p backend/dist
   tar -xzf backend-binary-linux-x64.tar.gz -C backend/dist/
   
   # Extract frontend build
   mkdir -p frontend
   tar -xzf frontend-build.tar.gz -C frontend/
   ```

3. **Configure environment**:

   ```bash
   cp .env.prod.template .env.prod
   nano .env.prod  # Edit with your values
   ```

4. **Start services**:

   ```bash
   docker-compose -f docker-compose.prebuilt.yml up -d
   ```

5. **Access the application**:
   - Open <http://your-server-ip> in your browser
   - Default trial license: 30 days

For detailed installation instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

## 🔑 Licensing

### Free Trial

- **30 days** full-featured trial
- Automatically activated on first startup
- No credit card required

### Commercial License

After the trial period, purchase a commercial license:

```bash
python3 activate_license.py YOUR-LICENSE-KEY
```

**Purchase a license**: [Contact Sales](mailto:sales@yourdomain.com)

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Complete installation and configuration
- [License Activation](DEPLOYMENT.md#license-activation) - How to activate your license
- [Troubleshooting](DEPLOYMENT.md#troubleshooting) - Common issues and solutions

## 🛡️ Security

This software is distributed as compiled binaries to protect intellectual property and ensure security:

- Backend: Native compiled binary (Nuitka)
- Frontend: Optimized standalone build
- Containers: Minimal distroless images
- No source code included

## 💼 Commercial Use

This software is licensed for commercial use. Each installation requires a valid license key.

**Features**:

- Unlimited servers
- Priority support
- Regular updates
- Custom integrations available

**Contact**: <sales@yourdomain.com>

## 🆘 Support

- **Documentation**: Full guides included in this repository
- **Email Support**: <support@yourdomain.com>
- **License Issues**: <license@yourdomain.com>
- **Enterprise Support**: Available with commercial licenses

## 📋 System Requirements

### Minimum

- 2 CPU cores
- 2GB RAM
- 10GB disk space
- Docker & Docker Compose

### Recommended

- 4 CPU cores
- 4GB RAM
- 20GB SSD
- Ubuntu 20.04+ or similar

## 🔄 Updates

Updates are delivered as new Docker images. To update:

```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

Your license and data are preserved during updates.

## ⚖️ License

Copyright © 2024 Your Company Name. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.

See [LICENSE](LICENSE) for full terms.

## 🌐 Links

- **Website**: <https://yourdomain.com>
- **Documentation**: <https://docs.yourdomain.com>
- **Support Portal**: <https://support.yourdomain.com>

---

**AI Sysadmin Agent** - Making server management intelligent and effortless.
