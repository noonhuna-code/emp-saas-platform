-- Phase 2D Stage 2A validation harness (manual / local execution only)
-- Purpose: Cover Stage 2A invariants before Stage 2B work begins.
-- IMPORTANT:
--   - Do not run against production.
--   - Requires a local/dev Supabase database and authenticated test users.
--   - This file is not a migration and is not executed by `supabase db push`.

-- ==========================================================
-- Fixtures (replace placeholders with test fixture IDs)
-- ==========================================================
-- \set company_a '00000000-0000-0000-0000-0000000000a1'
-- \set company_b '00000000-0000-0000-0000-0000000000b1'
-- \set employee_a '00000000-0000-0000-0000-0000000000e1'
-- \set reviewer_profile_a '00000000-0000-0000-0000-0000000000p1'
-- \set request_id '00000000-0000-0000-0000-0000000000r1'

-- ==========================================================
-- Mandatory test cases (Stage 2A)
-- ==========================================================

-- 1) Double approval -> blocked
-- Steps:
--   1. Submit request
--   2. Approve request once (expect success)
--   3. Approve same request again (expect APPROVAL_NOT_PENDING / 409 at API layer)

-- 2) Double rejection -> blocked
--   1. Submit request
--   2. Reject request once
--   3. Reject same request again (expect APPPROVAL_NOT_PENDING path)

-- 3) Approve after reject -> blocked
--   1. Submit request
--   2. Reject request
--   3. Approve same request (expect blocked)

-- 4) Reject after approve -> blocked
--   1. Submit request
--   2. Approve request
--   3. Reject same request (expect blocked)

-- 5) Cross-tenant approval -> blocked
--   1. Create request in Company A
--   2. Call approve RPC under Company B session
--   3. Expect FINANCIAL_OBLIGATION_REQUEST_NOT_FOUND / scoped denial

-- 6) Idempotent RPC retry (API layer)
--   1. Call approve route with same Idempotency-Key + same payload twice
--   2. Expect replayed response, no duplicate writes
--   Note: route-level test (HTTP), not pure SQL. Validate with integration test harness or manual HTTP call.

-- 7) Schedule seeded correctly
--   1. Approve request with principal + term
--   2. Verify installment row count = term
--   3. Verify periods start next month and increment monthly
--   4. Verify sum(scheduled_amount) = principal_approved

-- 8) Ledger entries correct
--   submit -> request_created (amount = 0, request_id set, obligation_id null)
--   approve -> request_approved (amount = 0, request_id set, obligation_id null)
--   reject -> request_rejected (amount = 0, request_id set, obligation_id null)

-- 9) XOR constraint holds
--   Expect insert with both request_id and obligation_id set to fail
--   Expect insert with both null to fail

-- 10) Outstanding balance = principal
--   After approval, verify financial_obligations.outstanding_balance = principal_approved

-- ==========================================================
-- Reference verification queries (fill IDs / run in local dev)
-- ==========================================================

-- Schedule seeded correctly (case 7)
-- select
--   count(*) as schedule_count,
--   sum(scheduled_amount) as schedule_total,
--   min(make_date(year, month, 1)) as first_period,
--   max(make_date(year, month, 1)) as last_period
-- from public.financial_obligation_installments
-- where company_id = :'company_a'
--   and obligation_id = '<approved_obligation_id>';

-- Ledger request events (case 8)
-- select event_type, amount, request_id, obligation_id, created_at
-- from public.financial_obligation_ledger
-- where company_id = :'company_a'
--   and request_id = '<request_id>'
-- order by created_at asc;

-- XOR constraint checks (case 9) - expect failures
-- begin;
-- insert into public.financial_obligation_ledger (
--   company_id, request_id, obligation_id, event_type, amount, reference_type
-- ) values (
--   :'company_a', '<request_id>', '<obligation_id>', 'request_created', 0, 'request'
-- );
-- rollback;

-- begin;
-- insert into public.financial_obligation_ledger (
--   company_id, event_type, amount, reference_type
-- ) values (
--   :'company_a', 'request_created', 0, 'request'
-- );
-- rollback;

-- ==========================================================
-- EXPLAIN ANALYZE targets (run in local/dev with representative data)
-- ==========================================================

-- Review queue query index use
-- explain analyze
-- select id, company_id, employee_id, obligation_type, status, created_at
-- from public.financial_obligation_requests
-- where company_id = :'company_a'
--   and status in ('submitted', 'under_review')
-- order by created_at asc
-- limit 50;

-- Obligation detail schedule lookup
-- explain analyze
-- select id, year, month, scheduled_amount, status
-- from public.financial_obligation_installments
-- where company_id = :'company_a'
--   and obligation_id = '<obligation_id>'
-- order by year asc, month asc;

-- Obligation ledger timeline lookup
-- explain analyze
-- select id, event_type, amount, created_at
-- from public.financial_obligation_ledger
-- where company_id = :'company_a'
--   and obligation_id = '<obligation_id>'
-- order by created_at desc
-- limit 50;

-- Status history timeline lookup
-- explain analyze
-- select id, entity_scope, new_status, created_at
-- from public.financial_obligation_status_history
-- where company_id = :'company_a'
--   and obligation_id = '<obligation_id>'
-- order by created_at desc;

