-- ============================================
-- Migration: 20260226120235_billing_cancel_and_snapshot_schema_patch.sql
-- Purpose : Cancellation support and snapshot/proof schema hardening
-- Scope   : Additive + replay-safe
-- ============================================

alter table public.company_subscriptions
  add column if not exists cancellation_requested_at timestamptz;

create index if not exists company_subscriptions_cancel_requested_idx
  on public.company_subscriptions (company_id, cancellation_requested_at desc)
  where cancellation_requested_at is not null and is_current = true;

alter table public.billing_invoices
  add column if not exists payment_method_snapshot text;

update public.billing_invoices
   set payment_method_snapshot = coalesce(
     nullif(trim(payment_method_snapshot), ''),
     nullif(trim(payment_provider), ''),
     'manual'
   )
 where payment_method_snapshot is null
    or nullif(trim(payment_method_snapshot), '') is null;

alter table public.billing_invoices
  alter column payment_method_snapshot set not null;

alter table public.billing_invoices
  drop constraint if exists billing_invoices_payment_method_snapshot_chk;

alter table public.billing_invoices
  add constraint billing_invoices_payment_method_snapshot_chk
  check (payment_method_snapshot in ('bank_transfer', 'jazzcash', 'stripe', 'manual'));

create unique index if not exists billing_invoices_company_period_non_void_unique
  on public.billing_invoices (company_id, period_start, period_end)
  where status <> 'void';

alter table public.billing_payment_proofs
  add column if not exists proof_content_hash text;

update public.billing_payment_proofs
   set proof_content_hash = lower(
     md5(
       coalesce(proof_storage_path, '')
       || ':'
       || coalesce(reference_number, '')
       || ':'
       || coalesce(amount_minor::text, '')
     )
     ||
     md5(
       coalesce(reference_number, '')
       || ':'
       || coalesce(amount_minor::text, '')
       || ':'
       || coalesce(proof_storage_path, '')
     )
   )
 where proof_content_hash is null
    or nullif(trim(proof_content_hash), '') is null;

alter table public.billing_payment_proofs
  alter column proof_content_hash set not null;

alter table public.billing_payment_proofs
  drop constraint if exists billing_payment_proofs_content_hash_chk;

alter table public.billing_payment_proofs
  add constraint billing_payment_proofs_content_hash_chk
  check (proof_content_hash ~ '^[A-Fa-f0-9]{64}$');

create index if not exists billing_payment_proofs_company_hash_idx
  on public.billing_payment_proofs (company_id, invoice_id, proof_content_hash, created_at desc);
