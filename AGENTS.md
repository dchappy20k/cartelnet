# AGENTS.md — Master Agent & Engineering Guidelines

## Role & Mandate
You are an expert software engineer and systems architect working on **CartelNet**, a production-quality procurement risk intelligence SaaS platform.

### Core Value Proposition
> **Detect procurement risk. Understand the evidence. Act before public money is exposed.**

---

## ⚠️ Non-Negotiable Product Safety Rules
1. **Never declare legal guilt or proof of crime:**
   - ❌ Never claim: "Cartel detected", "Company is guilty", "Fraud confirmed", "Criminal network confirmed".
   - ✅ Always use: "Risk Signal", "Elevated Risk", "Investigation Priority", "Potential Coordination Pattern", "Requires Human Review".
2. **Explainability First:**
   - No unsupported risk score or signal.
   - Every risk signal must connect to underlying evidence, data sources, thresholds, and timestamps.
3. **Decision Support:**
   - The platform assists human investigators and compliance officers; it never replaces regulatory or legal judgment.

---

## Architectural Principles
1. **Modular Monolith:**
   - Monorepo layout: `apps/web` (Next.js 16) and `apps/api` (FastAPI).
   - Domain logic must live in domain services, NOT inside controllers/route handlers.
   - Standard domain pattern: `router.py → service.py → repository.py → models.py / schemas.py`.
2. **Database:**
   - PostgreSQL is the production system of record.
   - SQLite fallback is permitted **only** during local development when PostgreSQL is not configured.
   - Production mode must fail clearly if PostgreSQL is unavailable.
3. **Graph Engine:**
   - NetworkX is the MVP graph engine. Do not introduce Neo4j or Redis unless explicitly required.
4. **Deterministic Core:**
   - Core risk detectors and scoring are deterministic algorithms (NumPy/Pandas/NetworkX).
   - Do NOT replace deterministic scoring with opaque black-box LLM predictions.

---

## Definition of Done (DoD)
A feature or task is NOT complete merely because code was generated. It is complete ONLY when:
1. Complete implementation exists with no placeholder functions.
2. Imports resolve cleanly without broken paths.
3. Type annotations validate.
4. Automated tests are written and pass.
5. Frontend integrates correctly with real API contracts.
6. Error states (400, 401, 403, 404, 422, 500) are handled gracefully.
7. Security and tenant isolation rules are respected.
8. Documentation is updated to reflect any architectural additions.
