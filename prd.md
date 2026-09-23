# CartelNet — Product Requirements Document (PRD)

**Version:** 1.0 MVP  
**Status:** Prototype / MVP  
**Product:** CartelNet  
**Category:** Procurement Risk Intelligence SaaS  
**Primary Users:** Government procurement authorities, public-sector procurement teams, auditors/investigators, and construction/infrastructure companies.

---

## 1. Product Summary

CartelNet is a procurement intelligence platform that analyzes tender, bidder, company, relationship, and historical bidding data to identify suspicious procurement-risk signals and organize the supporting evidence for human review.

CartelNet is **not** a legal or law-enforcement decision engine. It does not declare that a company has committed cartelization or any unlawful conduct. It highlights patterns that may warrant additional review and gives authorized users the tools to investigate them.

### Core value proposition

> **Detect procurement risk. Understand the evidence. Act before public money is exposed.**

---

## 2. Problem Statement

Procurement teams often work with fragmented tender records, bidder information, historical participation data, and company relationships. Suspicious patterns may be difficult to identify when the relevant evidence is distributed across multiple records.

CartelNet addresses the operational problem of:

- finding potentially unusual bidding patterns,
- connecting related entities,
- identifying repeated historical patterns,
- explaining why a tender was flagged, and
- turning the signals into a structured human-review workflow.

---

## 3. Goals

### MVP goals

1. Import synthetic or structured procurement data.
2. Normalize tender, bidder, company, director, address, bid, and relationship records.
3. Run explainable procurement-risk detectors.
4. Calculate a screening-level risk score.
5. Visualize relationships through an interactive graph.
6. Show supporting evidence for every risk signal.
7. Allow an authorized reviewer to create and manage an investigation.
8. Generate an investigation/report-ready summary.
9. Support separate organization workspaces with role-based access.
10. Provide a seamless dashboard-to-investigation workflow.

### Non-goals for MVP

- Legal determination of collusion or cartelization.
- Fully autonomous investigation decisions.
- Real-time integration with every public procurement portal.
- National-scale production deployment.
- Predicting criminal intent.
- Replacing procurement officers, auditors, or legal investigators.

---

## 4. Target Users

### Government / Public Authority

**Procurement Officer**  
Monitors tenders, reviews risk signals, and routes tenders for additional review.

**Auditor / Compliance Analyst**  
Examines evidence, historical participation, relationships, and recurring patterns.

**Investigator**  
Owns investigation cases, records findings, tracks evidence, and prepares reports.

**Organization Admin**  
Manages users, workspace configuration, and access.

### Construction / Infrastructure Company

For the MVP, company workspaces support organizational data, tender participation visibility, compliance workflows, and company relationship information. Government investigation controls must not be exposed to company users unless explicitly authorized by the product's access model.

---

## 5. Core User Journey

```text
Login
  ↓
Organization Dashboard
  ↓
Attention Required
  ↓
Open Tender
  ↓
Tender 360
  ↓
Risk Signals
  ↓
Explore Relationship Network
  ↓
Inspect Evidence
  ↓
Create Investigation
  ↓
Assign Reviewer
  ↓
Add Notes / Actions
  ↓
Generate Report
```

The application must always communicate:

- Where the user is.
- What happened.
- Why it matters.
- What evidence supports it.
- What the user can do next.

---

## 6. Feature Scope

## 6.1 Authentication & Organization Onboarding

### Requirements

- Login with email/password.
- Organization-aware registration.
- Organization type selection:
  - Government / Public Authority
  - Construction / Infrastructure Company
- Email verification flow.
- Organization profile setup.
- Role selection.
- Optional SSO/MFA integration point for future implementation.
- Password reset.
- Secure session handling.

### Registration data — Government

- Organization name
- Organization type
- Department / ministry
- State / region
- Office / division
- Official website
- Official email domain
- Authorized user details
- Optional authorization document

### Registration data — Company

- Legal company name
- Registration number
- Company type
- Industry
- Registered address
- State / city / postal code
- Website
- Official email domain
- Authorized user details
- Optional business registration document

---

## 6.2 Dashboard

### Purpose

Give the user an immediate understanding of what requires attention.

### Key metrics

- Active Tenders
- High-Risk Tenders
- Open Investigations
- Signals Detected
- Procurement Value Under Review

### Main areas

- Attention Required
- Risk Trends
- Recent Activity
- Quick Actions

### Primary CTA

**Review high-risk tenders**

---

## 6.3 Tender Management

Users can:

- Browse tenders.
- Search tenders.
- Filter by risk, authority, value, date, and status.
- Sort results.
- View tender details.
- Start an analysis.
- Open associated investigations.

### Tender fields

- Tender ID
- Tender name
- Authority
- Category
- Value
- Publication date
- Closing date
- Number of bidders
- Winner
- Status
- Risk score
- Signal count
- Last analyzed timestamp

---

## 6.4 Tender 360

The Tender 360 page is the core analysis workspace.

### Tabs

- Overview
- Bidders
- Risk Signals
- Network
- Timeline
- Evidence
- Investigation

### Overview

Show:

- Tender summary
- Value
- Authority
- Dates
- Award status
- Bidder count
- Winning bidder
- Risk summary

### Risk summary example

> **4 procurement-risk signals require human review.**

The interface must not state that unlawful conduct has been established.

---

## 6.5 Risk Detection Engine

Risk detection must be modular. Each detector should produce an independent explainable signal.

### Initial MVP detectors

#### A. Bid-price clustering

Identify unusually narrow separation among submitted bids.

Output should include:

- affected bids,
- observed values,
- comparison metric,
- threshold used,
- explanation.

#### B. Shared director relationship

Identify companies connected through a shared director record.

This is a relationship signal, not proof of collusion.

#### C. Shared registered address

Identify multiple bidders associated with the same registered address.

This is a screening signal only.

#### D. Repeated participation pattern

Identify repeated co-participation across tenders.

#### E. Historical winner/loser pattern

Highlight repeated patterns of participation and outcomes across prior tenders.

### Future detectors

- Bid rotation patterns
- Bid suppression / withdrawal patterns
- Complementary bidding patterns
- Subcontracting relationships
- Temporal co-participation patterns
- Advanced anomaly detection
- More sophisticated graph analytics

---

## 6.6 Risk Scoring

CartelNet may calculate a **screening score** from independent signals.

Example:

```text
Price clustering                  +25
Repeated participation            +20
Shared director                   +20
Historical pattern                +15
Shared address                    +10
Subcontracting relationship       +10
--------------------------------------
Screening score                   100
```

The actual weights must be configurable rather than hardcoded permanently into the UI.

### Risk bands

- Low
- Medium
- High
- Critical

### Mandatory UX rule

Every score must be explainable through the underlying signals.

Do not show a score without showing:

1. what signals contributed,
2. what evidence supports them,
3. when they were detected, and
4. what data source produced the evidence.

---

## 6.7 Relationship Network

CartelNet uses graph visualization to make relationships easier to investigate.

### Node types

- Tender
- Company
- Director
- Address
- Bid
- Subcontractor

### Relationship types

- Participated In
- Submitted Bid
- Shares Director
- Shares Address
- Subcontracted
- Won
- Lost

### UX requirements

- Zoom
- Pan
- Search
- Filter node types
- Filter relationship types
- Select node
- Highlight connected nodes
- Open entity details
- Reset graph

### Entity side panel

Example:

```text
Company A

Tenders: 14
Wins: 3
Losses: 11
Risk Signals: 4
Relationships: 8
```

Graph visuals must remain readable even as the dataset grows.

---

## 6.8 Evidence Management

Every risk signal must point to evidence.

### Evidence fields

- Evidence ID
- Signal ID
- Source record
- Evidence type
- Description
- Data timestamp
- Confidence / strength indicator
- Related entities

### Evidence categories

- Bid behaviour
- Company relationship
- Historical procurement
- Subcontracting
- Document evidence

### Principle

> **No unsupported risk claim.**

---

## 6.9 Investigations

The investigation module converts a risk signal into an operational review workflow.

### Investigation statuses

- New
- Under Review
- Waiting
- Escalated
- Closed

### Case fields

- Case ID
- Tender
- Priority
- Owner
- Status
- Created date
- Updated date
- Summary
- Findings
- Notes
- Evidence references

### Investigator actions

- Assign investigator
- Add note
- Attach evidence reference
- Request review
- Escalate
- Generate report
- Close investigation

### Important restriction

Do not create automated legal conclusions.

---

## 6.10 Data Ingestion

### MVP supported sources

- CSV
- Excel, if implemented in the prototype
- Demo dataset

### Workflow

```text
Select Source
   ↓
Upload
   ↓
Map Columns
   ↓
Validate
   ↓
Import
   ↓
Analyze
```

### Validation outputs

- Rows detected
- Valid rows
- Warnings
- Errors
- Missing fields
- Duplicate records

### Import requirements

- Safe parsing.
- Schema validation.
- Clear error reporting.
- Import progress.
- Import history.

---

## 6.11 Reports

### Report types

- Tender Risk Report
- Investigation Summary
- Procurement Risk Overview
- Company Relationship Report

### Report contents

- Executive summary
- Tender details
- Risk signals
- Evidence references
- Related entities
- Investigation status
- Human reviewer notes

### Exports

- PDF
- CSV

---

## 6.12 Search

Global search should support:

- Tenders
- Companies
- Investigations
- Directors
- Addresses

Keyboard shortcut:

`Cmd/Ctrl + K`

Results should be grouped by entity type.

---

## 6.13 Notifications

Examples:

- High-risk tender detected
- New relationship signal found
- Investigation assigned
- Data import completed
- Analysis completed

Notifications must link directly to the relevant object.

---

## 6.14 Roles & Permissions

### MVP roles

- Organization Admin
- Procurement Officer
- Analyst
- Investigator
- Viewer

### Rules

- Users only access organizations they belong to.
- Investigation controls are restricted to authorized roles.
- Company users cannot access government investigation workflows unless explicitly permitted by future cross-organization features.
- Administrative actions must be auditable.

---

## 7. Product Architecture

### Recommended MVP architecture

```text
Next.js + TypeScript
        ↓
FastAPI REST API
        ↓
PostgreSQL
        ↓
Pandas / NumPy / NetworkX
        ↓
Risk Detection + Graph Analytics
```

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- React Flow
- Recharts
- Lucide Icons

### Backend

- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL
- NetworkX
- Pandas
- NumPy

### Authentication

Use a modular auth layer so the implementation can later be replaced or extended with a managed provider such as Clerk, Auth0, or Supabase Auth.

### Future scale components

- Redis
- Background job framework
- Object storage
- Neo4j / graph database
- Advanced graph data science
- External procurement data connectors
- Enterprise SSO

These should not be mandatory for the first MVP.

---

## 8. Frontend UX Requirements

### Visual direction

CartelNet uses a restrained premium dark-glassmorphism design:

- deep graphite background,
- translucent surfaces,
- subtle blur,
- thin borders,
- restrained cyan/blue accents,
- minimal glow,
- high readability.

Glass effects must support hierarchy rather than decoration.

### Core UX principles

1. Evidence before conclusions.
2. One clear primary action per page.
3. Minimal cognitive load.
4. No dead-end screens.
5. Consistent navigation.
6. Strong empty/loading/error states.
7. Responsive design.
8. Human review remains central.

---

## 9. API Requirements

### Authentication

```http
POST /auth/register
POST /auth/login
POST /auth/verify-email
POST /auth/refresh
POST /auth/forgot-password
```

### Dashboard

```http
GET /dashboard/summary
GET /dashboard/activity
```

### Tenders

```http
GET /tenders
POST /tenders
GET /tenders/{id}
POST /tenders/{id}/analyze
GET /tenders/{id}/risk-signals
GET /tenders/{id}/network
GET /tenders/{id}/timeline
GET /tenders/{id}/evidence
```

### Investigations

```http
GET /investigations
POST /investigations
GET /investigations/{id}
PATCH /investigations/{id}
POST /investigations/{id}/notes
POST /investigations/{id}/actions
POST /investigations/{id}/report
```

### Data

```http
POST /data/import
GET /data/import/{id}
GET /data/import/history
```

### Search

```http
GET /search?q={query}
```

---

## 10. Data Model — MVP

### Organization

```text
id
name
type
email_domain
status
created_at
```

### User

```text
id
organization_id
name
email
role
status
created_at
```

### Tender

```text
id
organization_id
external_id
title
authority
value
category
publication_date
closing_date
status
winner_company_id
created_at
updated_at
```

### Company

```text
id
organization_id
legal_name
registration_number
industry
address
city
state
website
created_at
```

### Director

```text
id
name
```

### CompanyDirector

```text
company_id
director_id
relationship_type
```

### Bid

```text
id
tender_id
company_id
amount
rank
submitted_at
status
```

### RiskSignal

```text
id
tender_id
type
severity
confidence
score_contribution
summary
evidence_count
created_at
```

### Evidence

```text
id
risk_signal_id
type
source_record
summary
metadata
created_at
```

### Investigation

```text
id
organization_id
tender_id
owner_id
priority
status
summary
created_at
updated_at
```

### InvestigationNote

```text
id
investigation_id
author_id
content
created_at
```

---

## 11. Demo Dataset

The MVP must include clearly labeled **synthetic demo data**.

Example:

**Tender:** Municipal Water Infrastructure Upgrade  
**Value:** ₹12.4 Cr  
**Bidders:** 8

The demo dataset should contain enough records to demonstrate:

- multiple bidders,
- repeated tender participation,
- shared director relationship,
- shared address relationship,
- bid-price clustering,
- historical winner/loser patterns,
- company network connections,
- a complete investigation workflow.

The application must visibly label this data:

> **Synthetic Demo Data — not a real procurement case.**

---

## 12. Functional Requirements

### FR-01 Authentication

Users can register, verify, log in, log out, and reset passwords.

### FR-02 Organization isolation

Users cannot access another organization's private data.

### FR-03 Tender ingestion

Authorized users can upload a supported dataset and map fields.

### FR-04 Risk analysis

Authorized users can trigger tender analysis.

### FR-05 Explainability

Every risk score must be traceable to specific signals and evidence.

### FR-06 Graph exploration

Users can explore company and tender relationships interactively.

### FR-07 Investigation creation

Authorized users can create an investigation from a tender or risk signal.

### FR-08 Investigation management

Authorized users can assign, update, annotate, and close investigations.

### FR-09 Reporting

Authorized users can generate a structured report from investigation data.

### FR-10 Auditability

Security-sensitive and investigation-related actions should be recorded in an audit log.

---

## 13. Non-Functional Requirements

### Performance

- Dashboard should load quickly on normal demo datasets.
- Common API requests should normally return within an acceptable interactive range.
- Risk analysis may run asynchronously once processing becomes expensive.

### Security

- Passwords must never be stored in plain text.
- Authorization must be enforced server-side.
- Tenant isolation must be enforced.
- File uploads must be validated.
- Sensitive records must not leak through client-side access controls.

### Reliability

- Failed analysis must produce a visible error state.
- Imports should not silently partially succeed.
- Long-running jobs should expose status.

### Accessibility

- Keyboard-accessible interactive controls.
- Adequate text contrast.
- Visible focus states.
- Semantic forms and navigation.

### Observability

Future production implementation should include:

- structured application logs,
- error monitoring,
- audit logs,
- health checks,
- basic application metrics.

---

## 14. MVP Acceptance Criteria

The MVP is successful when a demo user can complete this journey without developer intervention:

```text
Register / Login
      ↓
Load Synthetic Demo Dataset
      ↓
Open Tender
      ↓
Run Risk Analysis
      ↓
View Risk Score
      ↓
Inspect Signals
      ↓
Open Evidence
      ↓
Explore Relationship Graph
      ↓
Create Investigation
      ↓
Assign Investigator
      ↓
Add Investigation Note
      ↓
Generate Report
```

### Required demo outcome

The reviewer should be able to understand:

> **What was flagged → why it was flagged → what evidence supports it → what a human reviewer should investigate next.**

---

## 15. Product Safety & Trust Rules

CartelNet must consistently distinguish between:

**Observed fact**  
A record exists in the dataset.

**Risk signal**  
The system detected a pattern matching a configured rule.

**Investigation**  
A human reviewer is examining the signal.

**Legal conclusion**  
Outside the scope of the system.

### Example wording

Use:

> “Three bids exhibit unusually narrow price separation.”

Use:

> “The companies share a director record.”

Use:

> “This combination of signals warrants enhanced review.”

Do not use:

> “Cartel confirmed.”

Do not use:

> “Company guilty.”

---

## 16. Future Roadmap

### Phase 2

- Excel and PDF ingestion
- OCR and document extraction
- More risk detectors
- Background processing
- Object storage
- Advanced audit logs
- Notification rules
- Saved investigations
- Advanced filtering

### Phase 3

- Neo4j integration
- Graph data science
- Entity resolution
- More advanced anomaly detection
- Procurement portal connectors
- Enterprise SSO
- Advanced analytics
- Organization-level risk monitoring

### Phase 4

- Multi-source procurement intelligence
- Advanced temporal graph analysis
- Human-in-the-loop investigation assistant
- Continuous procurement monitoring
- Enterprise deployment controls

---

## 17. Success Metrics

### Product metrics

- % of imported tenders successfully analyzed
- time from import to first risk result
- investigation creation rate
- evidence inspection rate
- report generation rate
- repeat use by procurement analysts

### Quality metrics

- signal explainability coverage
- false-positive review rate
- percentage of signals with supporting evidence
- data-validation error rate
- investigation completion rate

Metrics should measure product utility and workflow quality, not imply legal accuracy unless separately validated on an appropriate dataset.

---

## 18. Final Product Definition

CartelNet is a **modular procurement-risk intelligence SaaS** that connects:

```text
PROCUREMENT DATA
       ↓
ENTITY & RELATIONSHIP MODEL
       ↓
RISK SIGNALS
       ↓
EXPLAINABLE EVIDENCE
       ↓
NETWORK INVESTIGATION
       ↓
HUMAN REVIEW WORKFLOW
       ↓
REPORT / ACTION
```

The MVP should prioritize a seamless end-to-end workflow over a large number of features.

The product's central promise is:

> **CartelNet helps procurement teams find suspicious patterns faster, understand the evidence behind them, and move those signals into a structured human-review process.**
