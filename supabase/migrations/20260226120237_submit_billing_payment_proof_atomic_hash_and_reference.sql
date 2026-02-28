-- ============================================
-- Migration: 20260226120237_submit_billing_payment_proof_atomic_hash_and_reference.sql
-- Purpose : Require proof content hash + mandatory reference number for manual proofs
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.submit_billing_payment_proof_atomic(
  p_company_id uuid,
  p_invoice_id uuid,
  p_proof_storage_path text,
  p_proof_content_hash text,
  p_amount_minor bigint,
  p_currency_code text,
  p_reference_number text default null,
  p_payment_method text default 'bank_transfer',
  p_payment_date date default null,
  p_notes text default null,
  p_supersedes_proof_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_company_id uuid;
  v_actor_profile_id uuid;
  v_invoice record;
  v_currency text;
  v_method text;
  v_reference text;
  v_hash text;
  v_proof_id uuid;
  v_payment_date date;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_session_company_id := public.current_user_company_id();
  if v_session_company_id is null or p_company_id is null or p_company_id <> v_session_company_id then
    raise exception using errcode = 'P0001', message = 'TENANT_MISMATCH';
  end if;

  if not (
    public.current_user_has_permission('view_billing')
    or public.current_user_has_permission('manage_billing')
    or public.current_user_has_permission('manage_company')
  ) then
    raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
  end if;

  select up.id
    into v_actor_profile_id
  from public.user_profiles up
  where up.user_id = auth.uid()
    and up.company_id = p_company_id
    and up.is_deleted = false
  limit 1;

  if v_actor_profile_id is null then
    raise exception using errcode = 'P0001', message = 'ACTOR_PROFILE_NOT_FOUND';
  end if;

  if nullif(trim(coalesce(p_proof_storage_path, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'PAYMENT_PROOF_REQUIRED';
  end if;

  v_hash := lower(nullif(trim(coalesce(p_proof_content_hash, '')), ''));
  if v_hash is null or v_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = 'P0001', message = 'INVALID_PROOF_HASH';
  end if;

  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_PAYMENT_AMOUNT';
  end if;

  v_currency := upper(nullif(trim(coalesce(p_currency_code, '')), ''));
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' then
    raise exception using errcode = 'P0001', message = 'INVALID_PAYMENT_CURRENCY';
  end if;

  v_method := lower(nullif(trim(coalesce(p_payment_method, '')), ''));
  if v_method is null or v_method not in ('bank_transfer', 'jazzcash', 'stripe', 'manual') then
    raise exception using errcode = 'P0001', message = 'INVALID_PAYMENT_METHOD';
  end if;

  v_reference := nullif(trim(coalesce(p_reference_number, '')), '');
  if v_reference is null then
    raise exception using errcode = 'P0001', message = 'INVALID_PAYMENT_REFERENCE';
  end if;

  v_payment_date := coalesce(p_payment_date, current_date);

  select bi.*
    into v_invoice
  from public.billing_invoices bi
  where bi.company_id = p_company_id
    and bi.id = p_invoice_id
  limit 1
  for update;

  if v_invoice.id is null then
    raise exception using errcode = 'P0001', message = 'INVOICE_NOT_FOUND';
  end if;

  if v_invoice.status not in ('pending', 'overdue', 'under_review') then
    raise exception using errcode = 'P0001', message = 'INVOICE_STATE_CONFLICT';
  end if;

  if p_supersedes_proof_id is not null then
    if not exists (
      select 1
      from public.billing_payment_proofs bpp
      where bpp.company_id = p_company_id
        and bpp.id = p_supersedes_proof_id
        and bpp.invoice_id = p_invoice_id
    ) then
      raise exception using errcode = 'P0001', message = 'PAYMENT_PROOF_NOT_FOUND';
    end if;
  end if;

  insert into public.billing_payment_proofs (
    company_id,
    invoice_id,
    submitted_by_profile_id,
    proof_storage_path,
    proof_content_hash,
    amount_minor,
    currency_code,
    reference_number,
    payment_method,
    payment_date,
    notes,
    supersedes_proof_id,
    metadata_json,
    created_at
  )
  values (
    p_company_id,
    p_invoice_id,
    v_actor_profile_id,
    trim(p_proof_storage_path),
    v_hash,
    p_amount_minor,
    v_currency,
    v_reference,
    v_method,
    v_payment_date,
    nullif(trim(coalesce(p_notes, '')), ''),
    p_supersedes_proof_id,
    jsonb_build_object('submitted_via', 'manual_payment_proof'),
    now()
  )
  returning id into v_proof_id;

  if v_invoice.status in ('pending', 'overdue') then
    update public.billing_invoices
       set status = 'under_review',
           payment_reference = v_reference,
           payment_provider = coalesce(v_method, payment_provider),
           updated_by = v_actor_profile_id,
           updated_at = now()
     where id = v_invoice.id;

    perform public.write_billing_audit_event(
      p_company_id,
      v_actor_profile_id,
      'invoice_under_review',
      'billing_invoice',
      v_invoice.id,
      jsonb_build_object('proof_id', v_proof_id)
    );
  end if;

  perform public.write_billing_audit_event(
    p_company_id,
    v_actor_profile_id,
    'payment_proof_submitted',
    'billing_payment_proof',
    v_proof_id,
    jsonb_build_object(
      'invoice_id', p_invoice_id,
      'amount_minor', p_amount_minor,
      'currency_code', v_currency,
      'payment_method', v_method,
      'payment_date', v_payment_date,
      'reference_number', v_reference,
      'proof_content_hash', v_hash
    )
  );

  return jsonb_build_object(
    'proof_id', v_proof_id,
    'invoice_id', p_invoice_id,
    'invoice_status', 'under_review'
  );
end;
$$;
