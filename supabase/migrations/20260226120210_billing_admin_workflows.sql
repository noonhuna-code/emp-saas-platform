-- ============================================
-- Migration: 20260226120210_billing_invoice_period_unique_index.sql
-- Purpose : Billing invoice idempotency unique index
-- Scope   : Additive + replay-safe
-- ============================================

create unique index if not exists billing_invoices_company_subscription_period_uniq
  on public.billing_invoices (company_id, subscription_id, period_start, period_end)
  where status <> 'canceled';

