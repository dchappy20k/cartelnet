# CartelNet Security Architecture

## 1. Principles
- **Tenant Isolation:** Every query must enforce `organization_id` filtering. No cross-tenant access.
- **Authentication & Sessions:** Passwords hashed with bcrypt; stateless signed JWT tokens for API access.
- **Role-Based Access Control (RBAC):** Roles (`Admin`, `Procurement Officer`, `Compliance Analyst`, `Investigator`, `Viewer`) enforced in API dependency layer.
- **Secrets Management:** No hardcoded tokens, passwords, or keys. All injected via `.env`.
- **Upload Safety:** Limit file size (max 25MB for MVP), validate MIME types, sanitize filenames.
- **Audit Logging:** Security-sensitive events (login, role change, investigation status update, report export) logged to `audit_events`.
