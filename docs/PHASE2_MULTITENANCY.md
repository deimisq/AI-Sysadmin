# Phase 2: Multi-Tenancy & Organizations

**Timeline**: Q2 2026 (8-10 weeks)  
**Epic**: Enterprise SaaS Transformation  
**Status**: 🔴 Not Started

---

## Objectives

1. Implement organization-based data isolation (tenant boundaries)
2. Enable org-level user management and invitations
3. Add subscription billing integration (Stripe)
4. Support team collaboration within organizations
5. Ensure 100% data security between tenants

---

## Business Context

### Target Market

- **Small Teams** (5-10 users): Startups, dev teams
- **Mid-Market** (10-100 users): IT departments, MSPs
- **Enterprise** (100+ users): Fortune 500 companies

### Revenue Model

| Tier | Users | Price/Month | Target Segment |
|------|-------|-------------|----------------|
| Individual | 1 | $9 | Freelancers |
| Team | 10 | $49/user | Startups |
| Enterprise | Unlimited | Custom | Large Corps |

---

## Technical Architecture

### Data Model Evolution

#### New Entity: `Organization`

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Subscription
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, team, enterprise
    subscription_status VARCHAR(50) DEFAULT 'active', -- active, suspended, cancelled
    max_users INT DEFAULT 1,
    max_servers INT DEFAULT 5,
    
    -- Billing
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    
    -- Settings
    sso_enabled BOOLEAN DEFAULT FALSE,
    sso_provider VARCHAR(50), -- google, microsoft, okta
    sso_metadata JSONB, -- Provider-specific config
    
    -- Audit
    created_by_user_id INT REFERENCES users(id),
    
    CONSTRAINT valid_tier CHECK (subscription_tier IN ('free', 'individual', 'team', 'enterprise'))
);

CREATE INDEX idx_org_slug ON organizations(slug);
CREATE INDEX idx_org_stripe_customer ON organizations(stripe_customer_id);
```

#### Modified Entities (Add `organization_id`)

```sql
-- Users now belong to an organization
ALTER TABLE users 
    ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ADD COLUMN role_in_org VARCHAR(50) DEFAULT 'member'; -- owner, admin, member, viewer

-- Servers are org-scoped
ALTER TABLE servers 
    ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Groups are org-scoped
ALTER TABLE server_groups 
    ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Audit logs are org-scoped
ALTER TABLE audit_logs 
    ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- User invitations are org-scoped
CREATE TABLE organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    invited_by_user_id INT REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL, -- For email link
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Row-Level Security (RLS)

PostgreSQL policies to enforce tenant isolation:

```sql
-- Enable RLS on all org-scoped tables
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see servers in their org
CREATE POLICY org_isolation_servers ON servers
    FOR ALL
    USING (organization_id = current_setting('app.current_org_id')::UUID);

-- Policy: Org admins can manage servers
CREATE POLICY org_admin_servers ON servers
    FOR INSERT, UPDATE, DELETE
    USING (
        organization_id = current_setting('app.current_org_id')::UUID
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = current_setting('app.current_user_id')::INT
            AND role_in_org IN ('owner', 'admin')
        )
    );
```

**Usage in Application**:

```python
# Set session variables per request
@app.middleware("http")
async def set_tenant_context(request: Request, call_next):
    user = get_current_user(request)
    
    db = request.state.db
    db.execute(f"SET app.current_org_id = '{user.organization_id}'")
    db.execute(f"SET app.current_user_id = {user.id}")
    
    response = await call_next(request)
    return response
```

---

## Work Breakdown Structure (WBS)

### 1. Database Migration & Backend Models

**Task 1.1: Alembic Migration for Multi-Tenancy**  
**Assignee**: Backend Engineer  
**Effort**: 1 week  
**Dependencies**: None

**Subtasks**:

- [ ] Create migration: `alembic revision -m "add_organizations"`
- [ ] Write upgrade script:

  ```python
  def upgrade():
      op.create_table('organizations', ...)
      op.add_column('users', sa.Column('organization_id', ...))
      # ... all schema changes
  ```

- [ ] Write downgrade script (for rollback safety)
- [ ] Test migration on staging DB (seed data)
- [ ] Handle existing users:
  - Create default org for each existing user (1:1 mapping initially)
  - Or prompt users to create/join org on next login

**Deliverables**:

- `backend/alembic/versions/YYYY_MM_DD_add_organizations.py`

---

**Task 1.2: SQLAlchemy Models**  
**Assignee**: Backend Engineer  
**Effort**: 1 week  
**Dependencies**: Task 1.1

**Subtasks**:

- [ ] Create `Organization` model:

  ```python
  class Organization(Base):
      __tablename__ = 'organizations'
      
      id = Column(UUID(as_uuid=True), primary_key=True)
      name = Column(String(255), nullable=False)
      slug = Column(String(100), unique=True, nullable=False)
      subscription_tier = Column(String(50), default='free')
      # ... rest of fields
      
      # Relationships
      users = relationship("User", back_populates="organization")
      servers = relationship("Server", back_populates="organization")
  ```

- [ ] Update existing models:

  ```python
  class User(Base):
      organization_id = Column(UUID, ForeignKey('organizations.id'))
      role_in_org = Column(String(50), default='member')
      organization = relationship("Organization", back_populates="users")
  ```

- [ ] Add validation:
  - Slug must be URL-safe (alphanumeric + hyphens)
  - Unique constraint on slug
- [ ] Cascade deletes: If org deleted, soft-delete all resources?

**Deliverables**:

- `backend/models.py` (updated)
- `backend/schemas_organizations.py` (Pydantic schemas)

---

### 2. Organization Management API

**Task 2.1: CRUD Endpoints**  
**Assignee**: Backend Engineer  
**Effort**: 1.5 weeks  
**Dependencies**: Task 1.2

**Endpoints**:

```python
POST   /api/v1/organizations            # Create org (on signup or upgrade)
GET    /api/v1/organizations/current    # Get user's org details
PATCH  /api/v1/organizations/current    # Update org settings
DELETE /api/v1/organizations/current    # Delete org (owner only)
GET    /api/v1/organizations/current/members  # List all users in org
```

**Business Logic**:

- **Create Org**:
  - Generate unique slug from org name (`acme-corp`)
  - If slug exists, append number (`acme-corp-2`)
  - Set creator as `owner` role
  - Initialize free tier subscription
- **Delete Org**:
  - Require owner role
  - Confirmation (delete ALL servers, users, audit logs)
  - Optional: Grace period (soft delete for 30 days)

**Deliverables**:

- `backend/routers/organizations.py`
- Unit tests: `tests/routers/test_organizations.py`

---

**Task 2.2: User Invitation System**  
**Assignee**: Backend Engineer  
**Effort**: 2 weeks  
**Dependencies**: Task 2.1

**Flow**:

```
1. Org Admin clicks "Invite User" → Enters email + role
2. Backend generates invitation token (UUID + JWT)
3. Send email: "You've been invited to join Acme Corp on AI Sysadmin"
   - Link: https://app.com/accept-invite?token=abc123
4. New user clicks link → Signs up or logs in
5. Backend validates token, adds user to org
```

**Endpoints**:

```python
POST   /api/v1/organizations/current/invitations     # Send invitation
GET    /api/v1/organizations/current/invitations     # List pending invites
DELETE /api/v1/organizations/current/invitations/:id # Revoke invite

POST   /api/v1/invitations/accept                    # Accept invite (public)
```

**Email Template**:

```html
<h2>Join {{ organization.name }} on AI Sysadmin</h2>
<p>{{ inviter.name }} has invited you to join their team.</p>
<a href="{{ accept_link }}">Accept Invitation</a>
<p>This link expires in 7 days.</p>
```

**Edge Cases**:

- User already has an org → Show confirmation: "Leave current org?"
- Invite email already a member → Show friendly error
- Expired token → Show "Request new invite" option

**Deliverables**:

- `backend/routers/invitations.py`
- `backend/services/email_service.py` (SMTP integration)
- Email templates: `backend/templates/invite_email.html`

---

### 3. Frontend: Org Management UI

**Task 3.1: Organization Settings Page**  
**Assignee**: React Developer  
**Effort**: 1.5 weeks  
**Dependencies**: Task 2.1

**UI Components**:

- Organization profile (name, slug, logo upload)
- Subscription tier badge (Free / Team / Enterprise)
- Member list table:
  - Columns: Name, Email, Role, Last Active, Actions
  - Actions: Change Role, Remove (if admin/owner)
- Danger zone: Delete Organization button

**Permissions**:

- Only owners/admins see settings page
- Only owner can delete org

**Deliverables**:

- `frontend-desktop/src/routes/admin/organization.tsx`
- `frontend-desktop/src/components/admin/MemberList.tsx`

---

**Task 3.2: Invitation Flow UI**  
**Assignee**: React Developer  
**Effort**: 1 week  
**Dependencies**: Task 2.2

**Screens**:

1. **Invite Modal** (in settings page):
   - Email input
   - Role dropdown (Admin, Member, Viewer)
   - Send button
2. **Accept Invite Page** (`/accept-invite?token=...`):
   - Show org name + inviter
   - If not logged in: Show signup form
   - If logged in: "Join Acme Corp?" button
   - On success: Redirect to dashboard

**Deliverables**:

- `frontend-desktop/src/components/modals/InviteUserModal.tsx`
- `frontend-desktop/src/routes/accept-invite.tsx`

---

### 4. Billing Integration (Stripe)

**Task 4.1: Stripe Webhook Handler**  
**Assignee**: Backend Engineer  
**Effort**: 1.5 weeks  
**Dependencies**: Stripe account setup

**Webhook Events**:

```python
@app.post("/api/v1/webhooks/stripe")
async def stripe_webhook(request: Request):
    event = stripe.Webhook.construct_event(
        request.body, 
        request.headers['Stripe-Signature'], 
        STRIPE_WEBHOOK_SECRET
    )
    
    if event.type == 'customer.subscription.created':
        # Upgrade org to paid tier
        org = get_org_by_stripe_customer(event.data.object.customer)
        org.subscription_tier = 'team'
        org.subscription_status = 'active'
        db.commit()
    
    elif event.type == 'customer.subscription.deleted':
        # Downgrade to free tier
        org.subscription_tier = 'free'
        org.max_users = 1
        # TODO: Notify user, suspend extra members
```

**Security**:

- Verify webhook signature (prevent spoofing)
- Idempotency: Handle duplicate webhooks

**Deliverables**:

- `backend/routers/webhooks.py`
- `backend/services/billing_service.py`

---

**Task 4.2: Subscription Upgrade Flow**  
**Assignee**: React Developer  
**Effort**: 1 week  
**Dependencies**: Task 4.1

**UI Flow**:

```
1. User clicks "Upgrade to Team" in settings
2. Redirect to Stripe Checkout (hosted page)
3. User enters payment details
4. Stripe redirects back: /billing/success?session_id=...
5. Backend validates session, updates org tier
6. Show success message + confetti 🎉
```

**Endpoints**:

```python
POST /api/v1/billing/create-checkout-session
  → Returns Stripe Checkout URL

GET /api/v1/billing/portal
  → Customer portal for managing subscription (Stripe-hosted)
```

**Deliverables**:

- `frontend-desktop/src/routes/admin/billing.tsx`
- Stripe integration guide: `docs/STRIPE_SETUP.md`

---

### 5. Tenant Isolation Testing

**Task 5.1: Security Audit**  
**Assignee**: Security Engineer (or external consultant)  
**Effort**: 2 weeks  
**Dependencies**: All backend tasks complete

**Test Scenarios**:

- [ ] **Cross-Tenant Data Leakage**:
  - Create 2 orgs (A and B)
  - User A tries to access Server from Org B (must fail)
  - SQL Injection attempt to bypass RLS
- [ ] **Privilege Escalation**:
  - Member tries to invite users (must fail, admin-only)
  - Viewer tries to delete server (must fail)
- [ ] **Invitation Token Abuse**:
  - Reuse expired token (must fail)
  - Forge token signature (must fail)

**Tools**:

- OWASP ZAP (automated security scan)
- Burp Suite (manual pen testing)
- Custom scripts (Postman/pytest)

**Deliverables**:

- `security/penetration_test_report.pdf`
- List of vulnerabilities + fixes

---

**Task 5.2: Load Testing**  
**Assignee**: DevOps Engineer  
**Effort**: 1 week  
**Dependencies**: Task 5.1

**Scenarios**:

- 1000 orgs, each with 10 users and 50 servers
- Simulate 10,000 concurrent API requests
- Measure: Response time, DB query count, memory usage

**Target Metrics**:

- 95th percentile response time < 200ms
- DB connections < 100 (with connection pooling)
- Zero data leaks between orgs

**Tools**:

- Locust (Python load testing framework)
- Grafana + Prometheus (monitoring)

**Deliverables**:

- `benchmarks/multitenancy_load_test.md`

---

## Migration Strategy for Existing Users

### Option A: Auto-Create Orgs (Recommended)

```python
# In migration script
for user in existing_users:
    org = Organization(
        name=f"{user.username}'s Organization",
        slug=generate_slug(user.username),
        created_by_user_id=user.id
    )
    db.add(org)
    user.organization_id = org.id
    user.role_in_org = 'owner'
```

**Pros**: Zero user disruption  
**Cons**: Creates many single-user orgs (clutter)

### Option B: Prompt Users to Create Org

- On next login after migration: "Welcome! Create your organization"
- Force flow (can't skip)

**Pros**: Cleaner data model  
**Cons**: Friction, users might abandon

**Recommendation**: Option A + prompt to rename org

---

## Rollback Plan

If critical bugs found in production:

1. **Disable new signups** (prevent more orgs)
2. **Deploy hotfix** or **revert migration**:

   ```bash
   alembic downgrade -1  # Rollback one version
   ```

3. **Restore DB from backup** (if data corruption)
4. **Communicate to users** (status page update)

---

## Definition of Done (DoD)

- [ ] All database migrations tested on staging
- [ ] Security audit passes with zero critical issues
- [ ] Load test handles 10K concurrent users
- [ ] Stripe integration tested with test mode keys
- [ ] Invitation email sent successfully (100 test invites)
- [ ] Documentation updated (API docs, user guide)
- [ ] Beta release to 50 orgs (2-week soak test)

---

## Success Metrics

**Technical**:

- Zero cross-tenant data leaks (security audit)
- API response time < 200ms (95th percentile)

**Business**:

- 100 paid orgs within 3 months post-launch
- $10K MRR (Monthly Recurring Revenue)
- Churn rate < 5%

---

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RLS policy bypass vulnerability | Low | Critical | External security audit before launch |
| Stripe webhook delays (data inconsistency) | Medium | High | Add retry logic + manual reconciliation tool |
| User confusion during migration | High | Medium | In-app tutorial + email campaign |

---

**Phase Owner**: Lead Backend Engineer  
**Created**: 2026-01-17  
**Next Review**: Bi-weekly sprint retrospective
