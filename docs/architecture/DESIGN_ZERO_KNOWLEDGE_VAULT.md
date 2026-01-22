# Technical Design: Zero-Knowledge Credential Vault

**Feature**: End-to-End Encrypted Credential Synchronization  
**Target Phase**: Phase 4  
**Security Level**: Critical  
**Compliance**: GDPR, SOC 2, HIPAA-ready

---

## Problem Statement

### Current Architecture (v1.0)

```
User → Backend → DB (Credentials encrypted with backend key)
```

**Vulnerabilities**:

1. **Server Breach**: If backend compromised, encryption key is exposed
2. **Insider Threat**: Database admin can decrypt credentials
3. **Compliance Risk**: Some regulations require client-side encryption

---

## Proposed Architecture (v2.0)

### Zero-Knowledge Model

```
User (Master Password) 
  ↓ Derive encryption key (Argon2id)
  ↓ Encrypt credentials locally
  ↓ Upload encrypted blob to backend
Backend (CANNOT decrypt, only stores ciphertext)
  ↓ Sync to other devices
New Device (User enters Master Password)
  ↓ Download encrypted blob
  ↓ Decrypt locally with derived key
```

**Key Principle**: Backend never has access to plaintext or encryption key.

---

## Cryptographic Design

### Key Derivation (Argon2id)

**Why Argon2id?**

- Winner of Password Hashing Competition (2015)
- Resistant to GPU/ASIC cracking (memory-hard)
- OWASP recommended for password storage

**Parameters**:

```rust
use argon2::{
    password_hash::{PasswordHasher, SaltString},
    Argon2, Params
};

let params = Params::new(
    65536,  // Memory cost (64 MB)
    3,      // Time cost (iterations)
    4,      // Parallelism
    None    // Output length (default 32 bytes)
).unwrap();

let salt = SaltString::generate(&mut OsRng);
let argon2 = Argon2::new_with_params(
    argon2::Algorithm::Argon2id,
    argon2::Version::V0x13,
    params
).unwrap();

let master_key = argon2.hash_password(
    master_password.as_bytes(),
    &salt
).unwrap();
```

**Output**: 32-byte key suitable for ChaCha20-Poly1305

---

### Encryption Algorithm (ChaCha20-Poly1305)

**Why not AES-GCM?**

- ChaCha20 is faster on mobile/ARM processors (no AES hardware acceleration)
- Poly1305 provides authenticated encryption (AEAD)
- Used by TLS 1.3, WireGuard, Signal Protocol

**Implementation**:

```rust
use chacha20poly1305::{
    aead::{Aead, KeyInit, OsRng},
    ChaCha20Poly1305, Nonce
};

struct CredentialEntry {
    server_id: String,
    username: String,
    password: String, // or SSH key path
}

fn encrypt_credential(key: &[u8; 32], entry: &CredentialEntry) -> Vec<u8> {
    let cipher = ChaCha20Poly1305::new(key.into());
    let nonce = ChaCha20Poly1305::generate_nonce(&mut OsRng); // 96-bit
    
    let plaintext = serde_json::to_string(entry).unwrap();
    
    let mut ciphertext = cipher.encrypt(&nonce, plaintext.as_bytes())
        .expect("encryption failed");
    
    // Prepend nonce to ciphertext (needed for decryption)
    let mut result = nonce.to_vec();
    result.append(&mut ciphertext);
    
    result
}

fn decrypt_credential(key: &[u8; 32], encrypted: &[u8]) -> CredentialEntry {
    let cipher = ChaCha20Poly1305::new(key.into());
    
    // Extract nonce (first 12 bytes)
    let nonce = Nonce::from_slice(&encrypted[..12]);
    let ciphertext = &encrypted[12..];
    
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .expect("decryption failed");
    
    serde_json::from_slice(&plaintext).unwrap()
}
```

---

## Data Model

### Local Storage (SQLite in Desktop App)

```sql
CREATE TABLE master_key_metadata (
    id INTEGER PRIMARY KEY,
    salt TEXT NOT NULL,     -- Base64-encoded salt for Argon2
    created_at TEXT NOT NULL,
    last_used_at TEXT
);

CREATE TABLE encrypted_credentials (
    id INTEGER PRIMARY KEY,
    server_id TEXT NOT NULL,
    encrypted_blob BLOB NOT NULL,  -- ChaCha20 ciphertext
    nonce BLOB NOT NULL,            -- 12 bytes (or prepended to blob)
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced_to_cloud BOOLEAN DEFAULT 0
);
```

### Cloud Storage (PostgreSQL Backend)

```sql
CREATE TABLE user_vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    encrypted_vault BYTEA NOT NULL,  -- Entire vault as single blob
    vault_version INT DEFAULT 1,     -- For conflict resolution
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata (NOT encrypted, for indexing)
    num_credentials INT,
    total_size_bytes INT,
    
    UNIQUE(user_id)
);
```

**Note**: Backend stores ONE encrypted blob per user (all credentials bundled).

---

## Sync Protocol

### Upload Flow (Device → Cloud)

1. **User adds/edits credential locally**
2. **Encrypt with master key**
3. **Serialize entire vault** (all credentials):

   ```rust
   struct Vault {
       credentials: Vec<CredentialEntry>,
       metadata: VaultMetadata,
   }
   
   let vault_json = serde_json::to_string(&vault)?;
   let encrypted_vault = encrypt_vault(&master_key, &vault_json);
   ```

4. **POST to backend**:

   ```http
   POST /api/v1/vault/sync
   Authorization: Bearer <JWT>
   Content-Type: application/octet-stream
   
   <encrypted_vault_bytes>
   ```

5. **Backend saves ciphertext** (version increment for conflict detection)

---

### Download Flow (Cloud → New Device)

1. **User enters master password**
2. **Derive encryption key** (same Argon2 params + salt)
3. **GET from backend**:

   ```http
   GET /api/v1/vault/download
   Authorization: Bearer <JWT>
   ```

4. **Decrypt vault** locally
5. **Store in local SQLite**

---

## Conflict Resolution

### Scenario: User edits credentials on 2 devices offline

**Device A**: Adds server X  
**Device B**: Adds server Y  
Both sync to cloud → Conflict!

**Solution: Last-Write-Wins with Merge**

```rust
fn merge_vaults(local: Vault, remote: Vault) -> Vault {
    let mut merged = HashMap::new();
    
    // Add all local credentials
    for cred in local.credentials {
        merged.insert(cred.server_id.clone(), cred);
    }
    
    // Overlay remote credentials (prefer newer timestamp)
    for cred in remote.credentials {
        if let Some(existing) = merged.get(&cred.server_id) {
            if cred.updated_at > existing.updated_at {
                merged.insert(cred.server_id.clone(), cred);
            }
        } else {
            merged.insert(cred.server_id.clone(), cred);
        }
    }
    
    Vault {
        credentials: merged.into_values().collect(),
        metadata: VaultMetadata { /* ... */ }
    }
}
```

**Alternative**: Conflict UI (show diff, let user choose)

---

## Password Recovery

### Problem: User Forgets Master Password

**Zero-Knowledge = No Recovery**

Mitigation strategies:

1. **Recovery Key (Recommended)**:
   - Generate 24-word mnemonic (BIP39)
   - Display once: "Write this down and store safely"
   - Can regenerate master key from mnemonic

   ```rust
   use bip39::{Mnemonic, Language};
   
   let mnemonic = Mnemonic::generate_in(Language::English, 24);
   println!("Recovery Key: {}", mnemonic.phrase());
   
   // Derive master key from mnemonic
   let seed = mnemonic.to_seed("");
   let master_key = &seed[..32];
   ```

2. **Vault Export**:
   - Allow user to download encrypted vault file
   - If master password lost, user can delete account and re-import vault

3. **Admin Override (NOT Zero-Knowledge)**:
   - Enterprise feature: Escrow master key with org admin
   - Defeats purpose of zero-knowledge, but some orgs require this

**Recommendation**: Recovery key (BIP39) + clear warnings

---

## Security Audit Checklist

- [ ] Key derivation uses OWASP-recommended Argon2id parameters
- [ ] Nonces are never reused (use OS random number generator)
- [ ] Master password never leaves device in plaintext
- [ ] Backend cannot decrypt vault (verified by independent audit)
- [ ] All crypto operations use constant-time algorithms (timing attack prevention)
- [ ] Memory is zeroed after use (prevent memory dumps)
- [ ] User is warned about password recovery limitations

---

## Performance Considerations

**Argon2 Benchmark**:

- Desktop (M1 Mac): ~200ms to derive key
- Mobile (iPhone 13): ~500ms
- Acceptable for login flow (one-time per session)

**Encryption Benchmark**:

- Encrypt 1000 credentials: ~50ms
- Decrypt 1000 credentials: ~50ms
- ChaCha20 throughput: 1 GB/s on modern CPUs

**Network Sync**:

- 1000 credentials ≈ 500 KB encrypted
- Upload time (4G LTE): ~1 second

---

## Regulatory Compliance

### GDPR (EU)

- ✅ "Right to be forgotten": User can delete vault instantly
- ✅ "Data portability": Export vault file
- ✅ "Encryption at rest": Yes (client-side + backend DB encryption)

### HIPAA (Healthcare)

- ✅ "End-to-end encryption": Yes
- ✅ "Audit logs": Backend logs all vault sync events (WHO, WHEN, IP)
- ⚠️ "Business Associate Agreement": May be required with cloud provider

### SOC 2

- ✅ "Encryption in transit": HTTPS/TLS 1.3
- ✅ "Key management": Keys never stored on server
- ✅ "Access control": User-specific JWT tokens

---

## Implementation Phases

### Phase 4.1: Core Encryption (4 weeks)

- Argon2 key derivation
- ChaCha20 encryption/decryption
- Local SQLite vault storage
- Unit tests (encrypt 1M credentials, benchmark)

### Phase 4.2: Cloud Sync (3 weeks)

- Backend API: upload/download vault
- Conflict resolution algorithm
- Integration tests (multi-device scenarios)

### Phase 4.3: Recovery Key (2 weeks)

- BIP39 mnemonic generation
- Recovery flow UI
- Security warnings

### Phase 4.4: Security Audit (3 weeks)

- External auditor review
- Penetration testing
- Compliance certification

---

## Open Questions

1. **Salt storage**: Store salt locally or sync to cloud?
   - **Recommendation**: Store in cloud (encrypted vault metadata)
   - Rationale: User can't recover vault on new device without salt

2. **Vault versioning**: Git-like commit history?
   - **Recommendation**: No (complexity vs. value)
   - Instead: Simple last-write-wins + merge

3. **Shared vaults** (for teams)?
   - **Challenge**: How to share master key securely?
   - **Solution**: Public key cryptography (Phase 5?)

---

## References

- [Argon2 Specification (RFC 9106)](https://www.rfc-editor.org/rfc/rfc9106.html)
- [ChaCha20-Poly1305 (RFC 8439)](https://www.rfc-editor.org/rfc/rfc8439.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Signal Protocol Cryptography](https://signal.org/docs/)

---

**Document Owner**: Security Architect  
**Last Updated**: 2026-01-17  
**Status**: Design Review (not yet implemented)
