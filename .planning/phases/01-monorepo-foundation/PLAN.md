# Phase 1: Repository Structure & Monorepo Foundation — Plan

## Goal
Transform the standalone extracted prototype into a unified, modular monorepo containing `apps/web` (Next.js 16 glassmorphic UI) and `apps/api` (FastAPI backend with modular monolith layout, SQLAlchemy, and NetworkX). Establish local development runtime and verify end-to-end connectivity.

---

## Tasks

### Task 1: Structure Monorepo Root & Move Frontend
- Create directory structure:
  - `apps/web/`
  - `apps/api/`
  - `data/demo/`
- Move extracted files from `c:\cartelnet\cartelnet-glassmorphism-ui-design\` into `c:\cartelnet\apps\web\`.
- Update `.gitignore` to ignore:
  - `node_modules/`, `.next/`, `dist/`
  - `.venv/`, `__pycache__/`, `*.pyc`
  - `.env`, `.env.local`
- Create root `.env.example` defining `DATABASE_URL`, `SECRET_KEY`, `NEXT_PUBLIC_API_URL`.

### Task 2: Configure & Verify Frontend (`apps/web`)
- Adjust `apps/web/package.json` for npm package manager compatibility (install dependencies via `npm install`).
- Configure `NEXT_PUBLIC_API_URL` environment variable support for API calls (default `http://localhost:8000/api/v1`).
- Ensure Next.js builds and runs cleanly.

### Task 3: Scaffold Modular FastAPI Backend (`apps/api`)
- Create Python 3.12 virtual environment in `apps/api/.venv`.
- Create `apps/api/requirements.txt` with:
  - `fastapi>=0.115.0`
  - `uvicorn[standard]>=0.32.0`
  - `pydantic>=2.9.0`
  - `pydantic-settings>=2.6.0`
  - `sqlalchemy>=2.0.36`
  - `networkx>=3.4.0`
  - `pandas>=2.2.0`
  - `numpy>=2.1.0`
  - `python-multipart>=0.0.12`
  - `pytest>=8.3.0`
  - `httpx>=0.28.0`
- Implement backend core structure:
  - `app/main.py`: FastAPI app with CORS middleware, lifespan events, API router mounting.
  - `app/core/config.py`: Settings loaded from environment via Pydantic Settings.
  - `app/core/errors.py`: Global exception handlers and error response schemas.
  - `app/db/session.py`: SQLAlchemy database engine and session dependency (SQLite fallback for quick local testing + PostgreSQL connection string support).
  - `app/db/base.py`: Declarative Base.
  - `app/modules/`: Scaffold module folders (`auth`, `organizations`, `tenders`, `companies`, `bids`, `risk`, `network`, `investigations`, `ingestion`, `reports`).
  - `app/api/router.py`: Central v1 API router aggregating module routers.
  - Add health check endpoint `GET /api/health` and version info.

### Task 4: Setup Monorepo Orchestration (`docker-compose.yml`)
- Create `docker-compose.yml` defining services:
  - `db`: PostgreSQL 16
  - `api`: FastAPI application
  - `web`: Next.js web application
- Add root `package.json` or helper start script for easy local running (`npm run dev:all` or similar).

### Task 5: Verification & End-to-End Tracer Test
- Install backend dependencies and run API server test (`pytest` health test).
- Install frontend dependencies and verify `next build` / `npm run dev`.
- Verify frontend can communicate with `GET /api/health`.

---

## Verification Criteria
1. `apps/web` runs on `http://localhost:3000` with the complete glassmorphism UI functional.
2. `apps/api` runs on `http://localhost:8000` and `GET /api/health` returns HTTP 200 with status info.
3. Interactive Swagger docs accessible at `http://localhost:8000/docs`.
4. Git tracks the monorepo cleanly with proper ignores for build artifacts and virtualenvs.
