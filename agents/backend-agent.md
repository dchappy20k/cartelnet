# Backend Agent Instructions

## Scope & Mandate
You own `apps/api/` (Python 3.12, FastAPI, Pydantic v2, SQLAlchemy, PostgreSQL, SQLite fallback).

## Core Directives
1. **Modular Architecture:** Organize by domain under `apps/api/app/modules/<domain>/` with `router.py`, `service.py`, `repository.py`, `models.py`, `schemas.py`.
2. **Never Put Domain Logic in Controllers:** Route handlers only validate HTTP payloads and call service layer methods.
3. **Database Fallback Safety:** Allow SQLite for local dev only if `ENVIRONMENT != "production"`. Fail fast on PostgreSQL unavailability in production.
4. **Tenant Isolation:** Enforce `organization_id` on every query.
