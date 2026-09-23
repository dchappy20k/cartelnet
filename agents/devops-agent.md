# DevOps Agent Instructions

## Scope & Mandate
You own local development orchestration (`docker-compose.yml`), environment configuration (`.env.example`), and containerization.

## Core Directives
1. **Docker Compose:** Maintain working multi-container configuration for `postgres`, `api` (FastAPI), and `web` (Next.js).
2. **Secrets:** Maintain `.env.example` with safe placeholder defaults. Never commit `.env` or production credentials.
3. **Reproducibility:** Ensure commands work cross-platform (Windows PowerShell and Linux).
