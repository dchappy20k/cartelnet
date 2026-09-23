# CartelNet Database Architecture

## 1. System of Record
- **Production:** PostgreSQL 16+ is mandatory. All migrations managed via Alembic.
- **Local Development:** SQLite is supported for fast local prototyping when PostgreSQL is unavailable.
- **Rule:** The system must NEVER silently fallback to SQLite in production (`ENVIRONMENT=production`). Production deployments must raise an explicit fatal error if PostgreSQL cannot be reached.

## 2. Relational Schema & Tables

### Multi-Tenancy & Identity
- `organizations` (`id`, `name`, `type`, `created_at`)
- `users` (`id`, `email`, `hashed_password`, `full_name`, `is_active`)
- `organization_memberships` (`id`, `user_id`, `organization_id`, `role`)

### Procurement Entities
- `tenders` (`id`, `organization_id`, `tender_ref`, `title`, `authority`, `estimated_value`, `status`, `risk_score`, `risk_level`, `created_at`)
- `companies` (`id`, `organization_id`, `legal_name`, `normalized_name`, `tax_id`, `registered_address_id`, `created_at`)
- `directors` (`id`, `organization_id`, `full_name`, `national_id_hash`, `created_at`)
- `company_directors` (`id`, `company_id`, `director_id`, `role`, `appointed_date`, `resigned_date`)
- `addresses` (`id`, `organization_id`, `raw_address`, `normalized_hash`, `city`, `postal_code`, `country`)
- `bids` (`id`, `tender_id`, `company_id`, `amount`, `status`, `submitted_at`)

### Risk & Evidence
- `risk_signals` (`id`, `organization_id`, `tender_id`, `detector_code`, `severity`, `confidence`, `score_contribution`, `title`, `explanation`, `created_at`)
- `evidence` (`id`, `organization_id`, `signal_id`, `source_type`, `source_id`, `summary`, `data_payload`)

### Case Management & Audit
- `investigations` (`id`, `organization_id`, `tender_id`, `case_ref`, `title`, `priority`, `status`, `assigned_to_user_id`, `created_at`, `updated_at`)
- `investigation_notes` (`id`, `investigation_id`, `author_user_id`, `content`, `created_at`)
- `audit_events` (`id`, `organization_id`, `user_id`, `action`, `resource_type`, `resource_id`, `metadata`, `created_at`)
- `imports` (`id`, `organization_id`, `filename`, `total_rows`, `valid_rows`, `error_count`, `status`, `created_at`)
