# Phase 3: Windows Support & Enterprise SSO

**Timeline**: Q2 2026 (6-8 weeks)  
**Epic**: Windows Infrastructure & Corporate Authentication  
**Status**: 🔴 Not Started

---

## Objectives

1. Add native RDP client for Windows server management
2. Implement PowerShell remoting (WinRM over HTTPS)
3. Support Google Workspace OAuth
4. Add SAML 2.0 for enterprise SSO (Okta, Azure AD, OneLogin)

---

## Architecture

### Multi-Protocol Support

```
Desktop App (Tauri)
    ├── SSH Client (Rust - Phase 1)
    ├── RDP Client (Phase 3) ──> Windows Servers (3389)
    └── WinRM Client (Phase 3) ──> PowerShell (5985/5986)
```

---

## Work Breakdown

### 1. RDP Integration

**Task 1.1: RDP Library Selection**  
**Options**:

- **FreeRDP** (subprocess): Mature, full-featured
- **rdp-rs** (Rust crate): Native, but less mature

**Recommendation**: FreeRDP subprocess (reliability > purity)

**Implementation**:

```rust
#[tauri::command]
async fn rdp_connect(server_id: String, host: String) -> Result<()> {
    let credentials = vault.get_credentials(server_id)?;
    
    // Launch FreeRDP in subprocess
    Command::new("xfreerdp")
        .args(&[
            "/v:$host",
            "/u:$username",
            "/p:$password",
            "/cert:ignore", // Accept self-signed certs
            "/dynamic-resolution" // Auto-resize
        ])
        .spawn()?;
    
    Ok(())
}
```

**Deliverables**:

- RDP connection UI (button on Windows servers)
- Embedded RDP window (optional, use FreeRDP `/parent-window`)

---

### 2. PowerShell Remoting

**Task 2.1: WinRM Client**  
**Crate**: `winrm-rs`

**Example**:

```rust
use winrm::WinRM;

let client = WinRM::new("https://192.168.1.10:5986")
    .with_credentials(username, password)?;

let output = client.run_cmd("Get-Service")?;
println!("{}", output.stdout);
```

**Features**:

- Execute scripts remotely
- Stream output to xterm.js (use custom adapter)
- Support both HTTP (5985) and HTTPS (5986)

**Deliverables**:

- PowerShell terminal mode (new tab type)
- Syntax highlighting for PS1 scripts

---

### 3. Enterprise SSO

**Task 3.1: Google Workspace OAuth**  
**Implementation**:

```python
# Backend
from authlib.integrations.starlette_client import OAuth
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

@app.get('/auth/google/login')
async def google_login(request: Request):
    redirect_uri = request.url_for('google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get('/auth/google/callback')
async def google_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)
    user_info = token['userinfo']
    # Create or login user
```

**Deliverables**:

- "Sign in with Google" button
- Admin setting: Restrict to specific Google Workspace domain

---

**Task 3.2: SAML 2.0**  
**Library**: `python3-saml`

**Flow**:

```
1. User clicks "Login with SSO"
2. Redirect to Identity Provider (Okta/Azure AD)
3. IDP authenticates user
4. POST SAML assertion to /auth/saml/callback
5. Backend validates signature, extracts user info
6. Issue JWT token
```

**Configuration**:

- Upload IDP metadata XML in admin panel
- Set ACS URL: `https://yourdomain.com/auth/saml/callback`

**Deliverables**:

- SAML SP (Service Provider) integration
- Admin UI for IDP configuration

---

## Subscription Tier Gating

| Feature | Free | Team | Enterprise |
|---------|------|------|------------|
| RDP Support | ❌ | ✅ | ✅ |
| PowerShell | ❌ | ✅ | ✅ |
| Google OAuth | ✅ | ✅ | ✅ |
| SAML SSO | ❌ | ❌ | ✅ (only) |

---

## Testing

**Windows Server Setup**:

- Azure VM or AWS EC2 (Windows Server 2022)
- Enable RDP (port 3389)
- Configure WinRM: `Enable-PSRemoting -Force`

**Test Cases**:

- [ ] RDP to Windows Server 2022, 2019, 2016
- [ ] Execute PowerShell commands remotely
- [ ] Google login with personal Gmail (should fail if domain restriction enabled)
- [ ] SAML login via Okta developer account

---

## Risks

- **FreeRDP licensing**: GPLv2 (compatible with commercial use)
- **WinRM security**: Requires HTTPS cert on target server
- **SAML complexity**: Each IDP has quirks (Okta uses different format than Azure AD)

---

**Phase Owner**: Senior Backend Engineer + Security Specialist  
**Timeline**: 6-8 weeks  
**Budget**: $30K (includes Azure VMs for testing)
