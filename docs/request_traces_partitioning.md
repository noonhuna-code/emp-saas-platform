# request_traces Monthly Partitioning (Design Only)

Status: Design only. No schema changes implemented.

## Goals
- Keep request trace writes fast under high volume.
- Make retention/archival safe and predictable.
- Avoid cross-tenant leakage by keeping company_id indexed per partition.

## Partition Strategy
- **Partition key:** `created_at`
- **Interval:** monthly
- **Naming convention:** `request_traces_YYYY_MM`
  - Examples: `request_traces_2026_01`, `request_traces_2026_02`

## Index Strategy (per partition)
- **Primary index:** `(company_id, created_at)`
- Optional secondary indexes can be evaluated later based on query patterns.

## Retention / Archival Strategy
- **Policy:** drop partitions older than **X months** (configurable).
- **Execution:** scheduled maintenance job (outside of migrations).
- **Safety:** only drop whole partitions, never delete row-by-row.

## Operational Notes
- New partitions should be created ahead of time (e.g., 1–2 months in advance).
- This design assumes existing RLS on `request_traces` remains intact.
- No service changes are required unless routing to specific partitions is introduced.

## Non-Goals
- No schema changes in this document.
- No partition DDL or automation scripts included.
