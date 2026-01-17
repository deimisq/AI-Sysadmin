# Audit System Architecture & Implementation Guide

## Overview

Based on industry best practices for auditing in **FastAPI + SQLAlchemy** applications, we have implemented a robust, multi-layered audit system aimed at providing full visibility into administrative actions while maintaining high performance.

## Architecture Patterns

### 1. Application-Level Auditing (Service Pattern)

This is the primary method implemented in the AI Sysadmin Agent. It focuses on capturing **Business Intent** rather than just raw data changes.

- **Why**: Knowing that a row changed in the `servers` table is less useful than knowing "Admin X executed 'Reboot' on Server Y".
- **Implementation**: `AuditService.log_action()` injected into controllers/routers.
- **Coverage**:
  - Authentication (Login/Register)
  - Resources (Create/Edit/Delete Servers & Users)
  - Operations (Execute Command, Diagnostic)

**Reference**: [FastAPI Dependency Injection for Logging](https://fastapi.tiangolo.com/tutorial/dependencies/)

### 2. Request-Level Auditing (Middleware)

This layer acts as a safety net, capturing HTTP metadata (IP, User Agent, Latency).

- **Implementation**: `AuditMiddleware` (Planned Phase 2 for high-compliance environments).
- **Current Status**: Handled partially via Nginx logs and `AuditService` metadata (ip_address field).

### 3. Data-Level Auditing (ORM Events)

This layer ensures data integrity tracking (Who changed what field from X to Y).

- **Technique**: SQLAlchemy `after_update` event listeners.
- **Status**: Used implicitly for `updated_at` timestamps. Full history tables are reserved for future Enterprise/Audited versions.

## Current Implementation Details

### Database Schema (`AuditLog` Model)

The `audit_logs` table provides a flexible schema using JSONB for details:

| Field | Type | Description |
|-------|------|-------------|
| `action` | String | Semantic action name (e.g., `create_server`) |
| `resource_type` | String | Target entity (e.g., `server`, `user`) |
| `details` | JSON | Context-aware data (e.g., command output, changes) |
| `user_id` | FK | Actor who performed the action |
| `ip_address` | String | Source IP |

### Reliability Mechanisms

To ensure 100% functionality and availability:

1. **Auto-Startup Checks**: The backend checks for the existence of the audit table on every boot (`main.py` -> `lifespan`).
2. **System Events**: Logs "System Startup" events to prove the logging pipeline is active even without user interaction.
3. **Fail-Safe**: Audit logging errors are captured so they don't crash the main application flow, but are reported to system logs.

## Usage for Developers

To instrument a new endpoint:

```python
from services.audit_service import AuditService

@router.post("/do-something")
def do_something(db: Session = Depends(get_db), user = Depends(get_current_user)):
    # ... business logic ...
    AuditService.log_action(
        db=db,
        user_id=user.id,
        action="do_something",
        resource_type="something",
        details={"result": "success"}
    )
```
