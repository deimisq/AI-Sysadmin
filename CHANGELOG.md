# Changelog

All notable changes to the AI Sysadmin Agent project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-25

### Added - Admin Panel & Advanced Features

#### User Management
- Complete CRUD operations for users
- Role-Based Access Control (RBAC) with 4 roles: Superadmin, Admin, Group Admin, User
- User activation/deactivation
- Group assignment for users
- Permission management per group
- User creation from admin panel

#### Server Management
- Centralized server management interface
- Server grouping and organization
- CRUD operations for servers
- Group-based access control
- Encrypted SSH credentials storage
- Server filtering by user permissions

#### Audit & Logging
- Comprehensive audit log system
- Search and filter capabilities
- Pagination for large log sets
- Date grouping for better organization
- Action tracking (create, update, delete)
- User and resource tracking

#### Dynamic Configuration
- **AI Configuration**:
  - LLM provider selection (Bedrock, Gemini, OpenAI)
  - API keys management
  - Model parameters (temperature, max tokens)
  - Provider-specific settings
- **Backend Configuration**:
  - Database URL
  - JWT settings
  - CORS configuration
  - Debug mode and log levels
- **Frontend Configuration**:
  - API URL
  - Application name
  - Theme selection (light/dark/system)
  - Language preferences
  - UI/UX settings
- **Communication Settings**:
  - SMTP configuration
  - Email notifications
  - Test email functionality

#### Security Features
- Allowed domains whitelist for registration
- Automatic approval for whitelisted domains
- Manual approval workflow for non-whitelisted domains
- Notification system for superadmins
- Security settings management interface

#### Email System
- SMTP email service implementation
- Configurable email settings
- Test email functionality with recipient input
- Support for TLS/STARTTLS
- HTML and plain text email formats
- Email notifications for system events

#### System Statistics
- Real-time system metrics dashboard
- User count statistics
- Server count statistics
- Group statistics
- Recent activity tracking

### Changed
- Server list now filters by user group permissions
- Non-admin users only see servers from their assigned groups
- Configuration changes apply immediately without backend restart
- Improved type handling in configuration components
- Enhanced error messages for better troubleshooting

### Fixed
- Configuration persistence issue in Communication Settings
- Type conversion for boolean and numeric values
- 502 Bad Gateway errors during container restarts
- User creation errors from admin panel
- Email test functionality now actually sends emails

### Security
- All sensitive configuration stored encrypted in database
- SSH credentials encrypted with Fernet (AES-128)
- API keys stored securely
- JWT token-based authentication
- Password hashing with bcrypt
- Audit trail for all administrative actions

## [1.0.0] - 2025-11-20

### Added - Initial Release

#### Core Features
- Conversational AI agent for server diagnostics
- Multi-turn chat interface
- Real-time diagnostic data collection
- Problem verification and analysis
- Command execution with human approval

#### AI Integration
- Amazon Bedrock (Claude 3.5 Sonnet) support
- Google Gemini 2.0 Flash support
- OpenAI GPT-4o support
- RAG (Retrieval-Augmented Generation) implementation
- Vector database with pgvector

#### Multi-language Support
- English and Spanish interfaces
- Bilingual AI responses
- Language preference persistence
- Dynamic language switching

#### Server Management
- Server inventory management
- SSH connection handling
- Encrypted credential storage
- Client and group organization

#### Automation
- Ansible integration for command execution
- Playbook support
- Structured and auditable execution
- Operation logging

#### Frontend
- Next.js 14 with React Server Components
- Responsive design with Tailwind CSS
- shadcn/ui components
- Markdown rendering for AI responses
- Modern, clean interface

#### Backend
- FastAPI REST API
- PostgreSQL database
- SQLAlchemy ORM
- Alembic migrations
- asyncssh for SSH connections

#### Security
- Encrypted SSH credentials
- Human approval for all commands
- Operation logging
- Environment variable configuration
- CORS protection

### Technical Stack
- **Backend**: Python 3.11, FastAPI, LangChain, SQLAlchemy
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Database**: PostgreSQL 16 with pgvector
- **AI**: Amazon Bedrock / Google Gemini / OpenAI
- **DevOps**: Docker, Docker Compose, Nginx

---

## Version History

- **v2.0.0** (2025-11-25): Complete admin panel, RBAC, dynamic configuration, email system
- **v1.0.0** (2025-11-20): Initial release with core AI agent functionality

## Upgrade Notes

### Upgrading from v1.0.0 to v2.0.0

1. **Backup your database** before upgrading
2. Pull the latest code: `git pull origin main`
3. Rebuild containers: `docker compose up --build -d`
4. Run database migrations: `docker compose exec backend alembic upgrade head`
5. Initialize new tables: `docker compose exec backend python init_tables.py`
6. Create a superadmin user if you haven't: `docker compose exec backend python create_superuser.py`
7. Access the admin panel at `/admin` and configure your system

### Breaking Changes in v2.0.0

- **Database schema changes**: New tables for users, roles, audit logs, configuration, etc.
- **Authentication required**: All endpoints now require authentication
- **Server access**: Users can only access servers from their assigned groups
- **Configuration**: Some environment variables can now be overridden from admin panel

### New Environment Variables

```env
# Required for user authentication
SECRET_KEY=your-jwt-secret-key-change-in-production

# Required for SSH credential encryption
ENCRYPTION_KEY=your-32-byte-encryption-key
```

## Future Roadmap

### Planned for v2.1.0
- [ ] Two-factor authentication (2FA)
- [ ] API key management for external integrations
- [ ] Webhook support for notifications
- [ ] Advanced reporting and analytics
- [ ] Bulk operations for users and servers

### Planned for v3.0.0
- [ ] Kubernetes deployment support
- [ ] Multi-tenancy support
- [ ] Advanced workflow automation
- [ ] Integration with monitoring tools (Prometheus, Grafana)
- [ ] Mobile app (iOS/Android)

### Under Consideration
- [ ] Slack/Teams integration for notifications
- [ ] Telegram bot interface
- [ ] Custom playbook builder UI
- [ ] AI model fine-tuning with organization data
- [ ] Advanced analytics and insights
- [ ] Compliance reporting (SOC 2, ISO 27001)

---

**For detailed documentation, see [README.md](./README.md)**
