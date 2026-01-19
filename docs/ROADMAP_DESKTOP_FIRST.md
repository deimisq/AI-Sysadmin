# AI Sysadmin Agent: Desktop-First Evolution Roadmap

**Strategic Vision**: Transform AI Sysadmin Agent from a cloud-centric SaaS platform to a desktop-first, enterprise-grade multi-tenant solution with hybrid cloud capabilities.

**Version**: 2.1 Roadmap
**Status**: Development Phase (Active)
**Target Release**: Q2-Q3 2026

---

## Executive Summary

This roadmap outlines the strategic and technical evolution of AI Sysadmin Agent, prioritizing:

1. **Client-Side Execution**: Moving SSH/RDP connection logic from backend to desktop app (Rust/Tauri)
2. **Enterprise Multi-Tenancy**: Organization-based isolation for B2B SaaS model
3. **Privacy-First AI**: Local LLM support (Ollama) for sensitive environments
4. **Advanced Enterprise Features**: Session recording, jump hosts, zero-knowledge encryption

---

## Strategic Objectives

### Business Goals

- **Target Market Shift**: From individual users → Enterprise teams & MSPs
- **Revenue Model**: Subscription tiers (Individual, Team, Enterprise)
- **Compliance**: SOC 2, GDPR, HIPAA-ready architecture
- **Competitive Edge**: Privacy, multi-protocol support, direct LAN access

### Technical Goals

- **Performance**: 10x faster SSH connections (eliminate backend proxy)
- **Scalability**: Support 1000+ organizations on single backend instance
- **Security**: Zero-knowledge encryption, local credential storage
- **Compatibility**: Linux, Windows (RDP/PowerShell), multi-platform desktop app

---

## Architecture Evolution

### Current State (v2.0-dev)

```
Desktop App (Rust Core)
    ├── Direct Native SSH (portable-pty) ──> Target Servers (LAN/Internet)
    ├── AI Automation (russh) ──> Automated tasks
    └── Backend (Python/FastAPI) ──> Sync & Management
```

**Achievements**:

- ✅ Hybrid Architecture: Native PTY for humans + Russh for AI
- ✅ Backend-independent terminal sessions

### Target State (v2.0-stable)

```
Desktop App (Rust Core)
    ├── Multi-Tab Terminal Manager
    ├── RDP Client ──> Windows Servers
    ├── Local AI (Ollama) ──> Private diagnostics
    │
    └── HTTPS (sync only) ──> Backend
                                ├── Org Management
                                ├── Audit Logs (aggregated)
                                └── PostgreSQL
```

---

## Implementation Phases

### Phase 1: Client-Side SSH & Multi-Tab Terminal (Q1 2026)

**Duration**: 6-8 weeks
**Status**: 🟢 In Progress

**Deliverables**:

- [x] **Rust SSH Core**: Integration of `russh` for automation and connection handling.
- [x] **Native PTY**: Implementation of `portable-pty` for full native terminal experience (Ctrl+C, vim, colors).
- [x] **Session Persistence**: Backend architecture to keep SSH sessions alive independent of UI state.
- [ ] **Multi-Tab UI**: React implementation for managing multiple simultaneous connections.
- [ ] **Credential Vault**: Secure local storage for keys/passwords.

**Success Metrics**:

- [x] SSH connections initiated < 500ms
- [ ] Support 20+ concurrent tabs without lag
- [ ] 100% feature parity with current web terminal (Completed: Native terminal exceeds web parity)

**Technical Details**: See [`PHASE1_CLIENT_SSH.md`](#)

---

### Phase 2: Multi-Tenancy & Organizations (Q2 2026)

**Duration**: 8-10 weeks  
**Status**: 🔴 Not Started

**Deliverables**:

- `Organization` model + database migrations
- Tenant isolation (row-level security)
- Org-level user invitations
- Billing integration (Stripe API)

**Data Model Changes**:

```sql
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    subscription_tier VARCHAR(50), -- individual, team, enterprise
    max_users INT,
    created_at TIMESTAMP
);

-- Add org_id to all resources
ALTER TABLE servers ADD COLUMN organization_id INT REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN organization_id INT REFERENCES organizations(id);
```

**Success Metrics**:

- [ ] 100% data isolation between orgs (security audit)
- [ ] Support 10,000 users across 1,000 orgs
- [ ] Signup-to-first-server time < 5 minutes

**Technical Details**: See [`PHASE2_MULTITENANCY.md`](#)

---

### Phase 3: Windows Support & Enterprise SSO (Q2 2026)

**Duration**: 6-8 weeks  
**Status**: 🔴 Not Started

**Deliverables**:

- RDP client integration (FreeRDP or native)
- PowerShell remoting (WinRM over HTTPS)
- Google Workspace OAuth
- SAML 2.0 support (Okta, Azure AD)

**Technical Stack**:

- **RDP**: `freerdp-rs` Rust bindings or subprocess invocation
- **WinRM**: `winrm-rs` crate
- **SSO**: `openidconnect` crate + backend auth flow

**Success Metrics**:

- [ ] RDP sessions launch < 2 seconds
- [ ] SSO reduces login friction by 80%
- [ ] Windows servers managed identically to Linux

**Technical Details**: See [`PHASE3_WINDOWS_SSO.md`](#)

---

### Phase 4: Advanced Features (Q3 2026)

**Duration**: 10-12 weeks  
**Status**: 🔴 Not Started

**Deliverables**:

- **Ollama Integration**: Local AI diagnostics
- **Jump Hosts**: Automatic SSH tunnel creation
- **Session Recording**: `.cast` format (asciinema-compatible)
- **Zero-Knowledge Sync**: E2EE for credentials

**Feature Details**:

#### 4.1 Local AI (Ollama)

- User downloads Ollama separately
- Desktop app detects local Ollama server (`http://localhost:11434`)
- Diagnostic queries stay 100% local
- Fallback to cloud AI if Ollama unavailable

#### 4.2 Jump Hosts (SSH Bastion Support)

```
Desktop ──SSH──> Jump Host (Bastion) ──SSH──> Target Server
```

- UI for configuring jump host chains
- Automatic `ProxyJump` configuration
- Support for multi-hop tunnels

#### 4.3 Session Recording

- Record all terminal I/O to `.cast` files
- Playback in-app or export for compliance
- Search/filter recordings by date, user, server
- Optional: Stream recordings to backend for org-wide audit

#### 4.4 Zero-Knowledge Encryption

- User sets master password on first launch
- Credentials encrypted with PBKDF2-derived key
- Backend stores encrypted blobs (cannot decrypt)
- Sync via API, decrypt locally only

**Success Metrics**:

- [ ] 90% of enterprise users enable session recording
- [ ] Ollama adoption rate > 30% in privacy-conscious sectors
- [ ] Zero-knowledge sync passes security audit

**Technical Details**: See [`PHASE4_ADVANCED_FEATURES.md`](#)

---

## Migration Strategy

### For Existing Users (v1.0 → v2.0)

**Backend Compatibility Mode**:

- v2.0 desktop app will **still support** legacy backend SSH mode
- Feature flag: `ENABLE_LEGACY_BACKEND_SSH=true`
- Gradual migration prompts in UI

**Data Migration**:

- Automatic migration script for v1.0 → v2.0 database schema
- Alembic migration: `2026_01_multitenancy_migration.py`
- Preserves all servers, audit logs, user accounts

**Communication Plan**:

- 60-day notice before deprecating v1.0
- In-app banners + email campaigns
- Free tier users automatically upgraded to Individual plan

---

## Subscription Tiers (Proposed)

| Feature | Free | Individual | Team | Enterprise |
|---------|------|------------|------|------------|
| Servers | 5 | 50 | 500 | Unlimited |
| Users per Org | 1 | 1 | 10 | Unlimited |
| AI Diagnostics | Cloud only | Cloud only | Cloud + Local | Cloud + Local |
| Session Recording | ❌ | ✅ (30 days) | ✅ (1 year) | ✅ (Unlimited) |
| Jump Hosts | ❌ | ❌ | ✅ | ✅ |
| SSO | ❌ | ❌ | ✅ | ✅ |
| Priority Support | ❌ | Email | Slack | Dedicated CSM |
| **Price (monthly)** | $0 | $9 | $49/user | Custom |

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Rust SSH library instability | High | Medium | Maintain Python fallback for 6 months |
| Multi-tenancy data leaks | Critical | Low | Extensive integration tests + penetration testing |
| Ollama performance on low-end hardware | Medium | High | Clear system requirements, graceful degradation |
| Desktop app signing certificates (macOS) | Medium | Medium | Apple Developer Account ($99/year) |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slow enterprise adoption | High | Free pilot programs for first 100 orgs |
| Pricing resistance | Medium | Grandfather existing users at 50% discount |
| Competition (Ansible Tower, etc.) | High | Emphasize AI + privacy + simplicity differentiators |

---

## Success Criteria (OKRs)

### Q1 2026

- **O1**: Validate client-side architecture
  - KR1: 100 beta testers using Rust SSH successfully
  - KR2: 95% report "faster than v1.0"

### Q2 2026

- **O2**: Launch multi-tenant SaaS
  - KR1: 50 paying organizations onboarded
  - KR2: $10K MRR
  
### Q3 2026

- **O3**: Establish enterprise credibility
  - KR1: 5 Fortune 500 pilot agreements
  - KR2: SOC 2 Type I certification

---

## Dependencies & Prerequisites

### Team Requirements

- 1x Rust Developer (Tauri core)
- 1x React Developer (UI/UX)
- 1x Backend Engineer (multi-tenancy)
- 1x DevOps (CI/CD, Tauri build pipeline)

### Infrastructure

- Apple Developer Account (macOS code signing)
- Windows Code Signing Certificate (extended validation)
- Stripe Account (billing)
- GitHub Actions (automated builds)

### Third-Party Services

- **Ollama**: Partnership/funding for official integration
- **Auth0 / WorkOS**: Enterprise SSO middleware (optional)

---

## Open Questions

1. **Licensing Model**: Open-source core with proprietary enterprise features? Or fully proprietary?
2. **Desktop App Updates**: Auto-update mechanism (Tauri built-in) or manual? Security implications?
3. **Backup/DR**: How do enterprise customers back up their credential vaults?
4. **Compliance Certifications**: Which to prioritize first? (SOC 2, ISO 27001, HIPAA)

---

## Next Steps

1. ✅ Review and approve this roadmap
2. 🟡 Create detailed technical specs for Phase 1
3. 🔴 Hire Rust developer or upskill existing team
4. 🔴 Set up Tauri build infrastructure
5. 🔴 Begin Phase 1 development sprint

---

**Document Owner**: Product & Engineering Team  
**Last Updated**: 2026-01-17  
**Review Cycle**: Bi-weekly (every other Friday)
