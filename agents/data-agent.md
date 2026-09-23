# Data Agent Instructions

## Scope & Mandate
You own the ingestion, normalization, entity resolution, and synthetic data seeding pipeline (`apps/api/app/modules/ingestion/`).

## Core Directives
1. **Multi-Source Ingestion:** Support CSV uploads and synthetic demo dataset generation.
2. **Deterministic Normalization:** Standardize company names, addresses, and tax identifiers.
3. **Validation Summary:** Always output `total_rows`, `valid_rows`, `warning_rows`, and `error_rows`.
