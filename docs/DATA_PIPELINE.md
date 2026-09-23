# CartelNet Data Pipeline Architecture

## 1. Flow
```
Upload / API → Column Mapping → Validation → Normalization → Deduplication → Entity Resolution → PostgreSQL
```

## 2. Ingestion Steps
1. **Source Upload:** CSV or Excel multipart upload.
2. **Column Mapping:** Map source headers to internal schema (`tender_ref`, `authority_name`, `contract_value`, `num_bidders`, `bidder_names`, `bid_amounts`).
3. **Dry-Run Validation:**
   - Detect data types, nulls, missing columns, malformed currency or dates.
   - Return validation counts: `Rows Detected`, `Valid Rows`, `Warnings`, `Errors`.
4. **Normalization:**
   - Entity name cleanup: standardizing legal extensions (`Inc`, `Ltd`, `LLC`, `Pvt Ltd`).
   - Normalizing address casing and punctuation into a search/hash key.
   - Parsing monetary values and ISO 8601 dates.
5. **Entity Resolution:**
   - Match existing company records by Tax ID or normalized name to avoid duplicate entities.
6. **Commit & Seeding:**
   - Atomic database transaction.
   - Built-in synthetic dataset generator for zero-file demo setup.
