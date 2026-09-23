# CartelNet Testing Strategy

## 1. Test Layers

### Backend Tests (pytest)
- **Unit Tests:** Detector math, normalization utilities, scoring weights.
- **Integration Tests:** FastAPI route handlers, database session rollback tests, health checks.
- Command:
  ```bash
  py -3.12 -m pytest apps/api/tests/ -v
  ```

### Frontend Tests
- **Type Checking:** `npm run build` or `npx tsc --noEmit`
- **Linting & Validation:** Ensure zero broken imports across app components.
- Command:
  ```bash
  cd apps/web && npm run build
  ```

### Verification Endpoints
- `GET /api/health` → `{"status": "ok", "app": "CartelNet API", "version": "1.0.0"}`
- `http://localhost:8000/docs` (Swagger UI)
- `http://localhost:3000` (Next.js Web UI)
