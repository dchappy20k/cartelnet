# Phase 7: Government JSON Bulk Upload to Database — Plan

## Goal
Implement a production-grade, government-facing **Bulk JSON Upload Module** for CartelNet. Enable authorized government procurement officers and compliance administrators to upload, strictly validate, deduplicate, and atomically commit tender datasets (tenders, registered companies, participants, bids) directly into the PostgreSQL/SQLite database with full provenance, audit logging, transaction safety, and seamless integration into CartelNet's risk detection and network graph engines.

---

## 1. Architecture & Reuse Audit

### Existing System Foundation:
- **Backend**: FastAPI 0.115+ in `apps/api/` with modular routing (`router.py -> service.py -> repository.py -> models.py / schemas.py`).
- **ORM & Database**: SQLAlchemy 2.0 with PostgreSQL (production) and SQLite fallback via `app/db/session.py`.
- **Existing Models**:
  - `Organization`, `User`, `OrganizationMembership` in `app/modules/organizations/models.py`.
  - `Company`, `Director`, `CompanyDirector`, `Address` in `app/modules/companies/models.py`.
  - `Tender` in `app/modules/tenders/models.py`.
  - `Bid` in `app/modules/bids/models.py`.
  - `RiskSignal`, `Evidence` in `app/modules/risk/models.py`.
- **Security & RBAC**: JWT access tokens (`python-jose`), password hashing (`passlib[bcrypt]`), and RBAC roles (`ADMIN`, `PROCUREMENT_OFFICER`, `COMPLIANCE_ANALYST`, `INVESTIGATOR`, `VIEWER`) via `app/modules/auth/dependencies.py`.
- **Frontend**: Next.js 16 (App Router), Tailwind CSS, Lucide icons, and CartelNet Glassmorphism design tokens (`apps/web/`).

### Extensions Required (No Architectural Breakage):
1. **Department & Participant Relational Models**:
   - `GovernmentDepartment`: Stores issuing departments (e.g. `department_code="PWD"`, `name="Public Works Department"`).
   - `TenderParticipant`: Stores tender-to-company registration relationships (`tender_id`, `company_id`, `registered_at`, `status`).
2. **Provenance & Source Tracking**:
   - Add `source_upload_id` and `department_id` references to `Tender`, `Company`, `Bid`, and `TenderParticipant`.
   - Add `source_company_id` (e.g. `"C001"`) on `Company` for deterministic foreign key resolution within uploaded batches.
   - Add `bid_rank` on `Bid`.
3. **Upload Audit Entity**:
   - `GovernmentUploadAudit`: Immutable audit record of every JSON upload attempt with status (`VALIDATING`, `VALID`, `INVALID`, `IMPORTING`, `IMPORTED`, `FAILED`, `ROLLED_BACK`), file metadata, metrics, and granular error logs.
4. **Validation & Atomic Ingestion Engine**:
   - Pydantic v2 strict models for government JSON validation.
   - Two execution pathways: `Validate-Only` (dry run, zero database mutation) and `Import` (atomic database transaction with immediate rollback on error).

---

## 2. Deliverables & Detailed Tasks

### Task 1: Database Models & Schema Extensions
**Files:**
- `apps/api/app/modules/government_uploads/models.py` (New module)
  - `GovernmentDepartment` (`departments` table):
    - `id` (UUID string), `name` (String 255), `department_code` (String 50, indexed), `organization_id` (TenantAware).
  - `TenderParticipant` (`tender_participants` table):
    - `id` (UUID string), `tender_id` (FK `tenders.id`), `company_id` (FK `companies.id`), `source_upload_id` (String 36), `registered_at` (String 50).
  - `GovernmentUploadAudit` (`government_uploads` table):
    - `id` (UUID string / `UPL-2026-xxxxx`), `organization_id`, `department_id` (Nullable FK), `uploaded_by` (User ID / email), `filename` (String), `file_size` (Integer), `uploaded_at` (Datetime), `status` (Enum: `VALIDATING`, `VALID`, `INVALID`, `IMPORTING`, `IMPORTED`, `FAILED`, `ROLLED_BACK`), `records_received` (JSON stats), `records_imported` (JSON stats), `records_failed` (Integer), `validation_errors` (JSON array of path + error), `processing_duration_ms` (Integer).
- Update `apps/api/app/modules/tenders/models.py`:
  - Add `department_id` (Optional FK `departments.id`), `location` (Optional String 255), `source_upload_id` (Optional String 36, indexed).
- Update `apps/api/app/modules/companies/models.py`:
  - Add `source_company_id` (Optional String 100, indexed) and `source_upload_id` (Optional String 36, indexed).
- Update `apps/api/app/modules/bids/models.py`:
  - Add `bid_rank` (Optional Integer), `source_upload_id` (Optional String 36, indexed).
- Register all new models in `apps/api/app/db/session.py` (`init_db()`).

---

### Task 2: Pydantic Validation Schemas & JSON Parser Safeguards
**Files:**
- `apps/api/app/modules/government_uploads/schemas.py`:
  - `RegisteredCompanySchema`: `company_id` (str, stripped, 1-100 chars), `company_name` (str, stripped, 1-255 chars).
  - `BidderSchema`: `company_id` (str, must match registered company), `bid_amount` (float, >= 0), `bid_rank` (int, >= 1), `status` (enum: `qualified`, `disqualified`, `shortlisted`, `rejected`, `submitted`).
  - `TenderItemSchema`: `tender_id` (str, required), `title` (str, required), `location` (str), `estimated_value` (float, >= 0), `submission_deadline` (ISO date string), `registered_companies` (list of `RegisteredCompanySchema`), `bidders` (list of `BidderSchema`).
  - `DepartmentSchema`: `name` (str, 1-255 chars), `department_code` (str, alphanumeric/dashes, 1-50 chars).
  - `GovernmentUploadPayload`: Root payload with `department` and `tenders: List[TenderItemSchema]`.
  - `ValidationErrorDetail`: `path` (str, e.g. `"tenders[0].bidders[1].bid_amount"`), `message` (str), `code` (str).
  - `ValidationResponse`: `success` (bool), `upload_id` (str), `status` (`VALID` | `INVALID`), `summary` (counts of tenders, companies, bidders, total value), `errors` (List[ValidationErrorDetail]), `warnings` (List[str]).
  - `ImportResponse`: `success` (bool), `upload_id` (str), `status` (`IMPORTED` | `ROLLED_BACK` | `FAILED`), `summary` (counts of departments, tenders, companies, participants, bids imported), `errors` (List[ValidationErrorDetail]), `processing_duration_ms` (int).
  - `UploadAuditOut`: Full audit history record schema.

---

### Task 3: Ingestion Service, Integrity Validation & Transaction Engine
**Files:**
- `apps/api/app/modules/government_uploads/service.py`:
  - `validate_json_payload(raw_bytes: bytes, filename: str, organization_id: str, uploaded_by: str, db: Session) -> ValidationResponse`:
    - Strict file checks: extension must be `.json` (case-insensitive).
    - Max file size check (50 MB limit).
    - UTF-8 decoding safeguard (reject invalid byte sequences).
    - Parse JSON with recursion/nesting depth limit.
    - Validate root structure against `GovernmentUploadPayload`.
    - Cross-record integrity checks:
      - Every bidder's `company_id` must exist in that tender's `registered_companies` or existing database companies for that tenant.
      - Tender duplicate check: check existing `department_code + tender_id` combinations.
      - Distinct bidder rank check within the same tender.
    - Create/update `GovernmentUploadAudit` record with `VALID` or `INVALID` status, execution duration, and parsed error list.
  - `commit_json_import(upload_id: str, payload_data: dict, organization_id: str, uploaded_by: str, db: Session) -> ImportResponse`:
    - Enforce atomic transaction (`db.begin_nested()` or managed session transaction).
    - If validation fails or any unhandled exception occurs, immediately issue `db.rollback()` and update audit record status to `ROLLED_BACK` or `FAILED`.
    - **Step 1: Department**: Lookup or create `GovernmentDepartment` by `(organization_id, department_code)`.
    - **Step 2: Companies Resolution**:
      - For each unique company in `registered_companies`:
        - Match priority 1: `source_company_id == item.company_id` within tenant.
        - Match priority 2: `normalized_name == normalize_company_name(item.company_name)`.
        - If existing company found: reuse existing `company.id`. Preserve canonical record.
        - If not found: create new `Company` with `source_company_id`, `legal_name`, `normalized_name`, `source_upload_id`.
    - **Step 3: Tenders**:
      - Match existing tender by `(organization_id, department_code, tender_id)`.
      - If exists: update metadata with provenance; if not: create new `Tender` with `source_upload_id`, `department_id`, `location`, `closing_date`.
    - **Step 4: Participants**:
      - Create `TenderParticipant` linking `tender_id` to resolved `company_id`.
    - **Step 5: Bids**:
      - Create `Bid` record for each bidder with resolved `company_id`, `tender_id`, `amount`, `status`, `bid_rank`, `source_upload_id`.
    - **Step 6: Risk Analysis Hook**:
      - Automatically trigger deterministic risk screening (`RiskEngineService.screen_tender(tender.id, db)`) so newly ingested tenders immediately have risk scores and signals available in Tender 360 and Network visualizer.
    - **Step 7: Commit & Audit Log**:
      - `db.commit()` only after all records pass without error.
      - Update audit record to `IMPORTED` with full breakdown stats and timestamp.

---

### Task 4: Government Upload API Endpoints
**Files:**
- `apps/api/app/modules/government_uploads/router.py`:
  - `POST /api/v1/government/uploads/validate`: Upload JSON file for dry-run validation. Requires `ADMIN` or `PROCUREMENT_OFFICER` role.
  - `POST /api/v1/government/uploads/import`: Upload JSON file and execute atomic import transaction into the database.
  - `GET /api/v1/government/uploads`: List previous uploads with audit status, records counts, and timestamps.
  - `GET /api/v1/government/uploads/{upload_id}`: Detailed inspection of a specific upload, including validation errors.
  - `GET /api/v1/government/uploads/sample-template`: Download official standard government procurement JSON template.
- Register `government_uploads_router` in `apps/api/app/api/router.py`.

---

### Task 5: Frontend Government Ingestion Workspace
**Files:**
- `apps/web/lib/api-client.ts`:
  - Add client API functions:
    - `validateGovernmentJson(file: File): Promise<ValidationResponse>`
    - `importGovernmentJson(file: File): Promise<ImportResponse>`
    - `listGovernmentUploads(): Promise<UploadAuditOut[]>`
    - `getGovernmentUploadDetail(uploadId: string): Promise<UploadAuditOut>`
    - `getSampleGovernmentJson(): object`
- `apps/web/app/(app)/data/page.tsx`:
  - Transform into a full-featured **Government Procurement Data Ingestion Center**:
    - **Drag & Drop JSON Upload Zone**:
      - Strict file acceptance: `.json` only (`application/json`).
      - Client-side rejection banner for `.csv`, `.xlsx`, `.pdf`, etc.
      - Live file info card: file name, file size (KB/MB), format badge.
    - **Interactive Controls**:
      - "Validate JSON Schema" button.
      - "Import to Database" button (disabled until validation passes).
      - "Download Sample Government JSON" quick link.
    - **Validation Feedback Panel**:
      - High-level metric tiles: Tenders detected, Companies detected, Bidders detected, Estimated Total Contract Value.
      - Status pill: `VALID` (green) or `INVALID` (red).
      - Collapsible Error Report table showing exact JSON path, invalid value, and human-readable explanation.
    - **Post-Import Success View**:
      - Live import counters: Tenders Imported, Companies Processed, Bidders Synced, Integrity Status (`Synced`).
      - Quick navigation buttons: `[ View Tenders ]`, `[ View Network Graph ]`, `[ View Risk Monitor ]`.
    - **Upload Audit History Table**:
      - Shows timestamp, filename, department, records received, status badge (`IMPORTED`, `INVALID`, `ROLLED_BACK`), duration, and error inspection drawer.

---

### Task 6: Comprehensive Automated Test Suite
**Files:**
- `apps/api/tests/test_government_json_upload.py`:
  - **Valid Upload Cases**:
    - Single tender, 2 registered companies, 2 qualified bidders.
    - Multi-tender batch across different departments.
    - Mixed ranks and statuses.
  - **Validation & Rejection Cases**:
    - Reject non-JSON files (e.g. `.csv`, `.xlsx`, `.txt`, `.pdf`).
    - Reject malformed / syntax-invalid JSON.
    - Reject missing mandatory department fields (`name`, `department_code`).
    - Reject negative `bid_amount` (< 0).
    - Reject invalid ISO date format.
    - Reject bidder referencing a `company_id` that is not registered.
  - **Transaction Atomicity & Rollback**:
    - Simulate mid-batch failure: verify 0 records committed to `tenders`, `companies`, or `bids`. Database remains intact.
  - **Deduplication & Entity Resolution**:
    - Upload batch 1 with `C001` ("ABC Infra").
    - Upload batch 2 with `C001` in a different tender: verify existing `Company` record is reused and NOT duplicated.
  - **Provenance & Audit Trail**:
    - Verify `GovernmentUploadAudit` records are created with correct counts, status, and duration.
  - **Security & RBAC**:
    - Verify unauthenticated requests return 401.
    - Verify viewer role without upload permission returns 403.
    - Verify file size exceeds threshold returns 413.

---

## 3. Definition of Done (DoD) Checklist
1. [x] Only `.json` files are accepted (strict frontend + backend validation).
2. [x] Pydantic v2 strict schema models for Department, Tenders, Registered Companies, and Bids.
3. [x] Full relational database insertion into `departments`, `tenders`, `companies`, `tender_participants`, and `bids`.
4. [x] All operations execute inside an atomic database transaction with rollback guarantees on failure.
5. [x] Canonical company deduplication and entity resolution.
6. [x] Full upload provenance (`source_upload_id`) stored on all records.
7. [x] Immutable upload audit history tracked in `government_uploads`.
8. [x] Next.js Government Data Ingestion Dashboard fully interactive with drag-and-drop, validation results, and history.
9. [x] 100% automated test coverage in `test_government_json_upload.py`.
10. [x] Existing CartelNet functionality (Phases 1-6) remains unbroken (39/39 backend tests passing, Next.js build clean).
