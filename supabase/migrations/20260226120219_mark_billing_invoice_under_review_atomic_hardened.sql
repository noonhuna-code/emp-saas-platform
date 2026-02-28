-- ============================================
-- Migration: 20260226120219_mark_billing_invoice_under_review_atomic_hardened.sql
-- Purpose : Enforce strict under_review transitions and audit events
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.mark_billing_invoice_under_review_atomic(
  p_company_id uuid,
  p_invoice_id uuid,
  p_payment_reference text default null,
  p_payment_provider text default null
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
  v_reference text;
  v_provider text;
  v_changed boolean := false;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_session_company_id := public.current_user_company_id();
  if v_session_company_id is null or p_company_id is null or p_company_id <> v_session_company_id then
    raise exception using errcode = 'P0001', message = 'TENANT_MISMATCH';
  end if;

  if not (
    public.current_user_has_permission('manage_billing')
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

  if v_invoice.status = 'paid' then
    return jsonb_build_object(
      'invoice_id', v_invoice.id,
      'status', 'paid',
      'changed', false
    );
  end if;

  if v_invoice.status not in ('pending', 'overdue', 'under_review') then
    raise exception using errcode = 'P0001', message = 'INVOICE_STATE_CONFLICT';
  end if;

  v_reference := nullif(trim(coalesce(p_payment_reference, '')), '');
  v_provider := nullif(trim(coalesce(p_payment_provider, '')), '');

  if v_provider is not null and v_provider not in ('jazzcash', 'bank', 'stripe', 'manual') then
    raise exception using errcode = 'P0001', message = 'INVALID_PAYMENT_PROVIDER';
  end if;

  if v_invoice.status = 'under_review'
     and coalesce(v_invoice.payment_reference, '') = coalesce(v_reference, coalesce(v_invoice.payment_reference, ''))
     and coalesce(v_invoice.payment_provider, '') = coalesce(v_provider, coalesce(v_invoice.payment_provider, '')) then
    return jsonb_build_object(
      'invoice_id', v_invoice.id,
      'status', 'under_review',
      'changed', false
    );
  end if;

  update public.billing_invoices
     set status = 'under_review',
         payment_reference = coalesce(v_reference, payment_reference),
         payment_provider = coalesce(v_provider, payment_provider),
         updated_by = v_actor_profile_id,
         updated_at = now()
   where id = v_invoice.id;

  v_changed := true;

  perform public.write_billing_audit_event(
    p_company_id,
    v_actor_profile_id,
    'invoice_under_review',
    'billing_invoice',
    v_invoice.id,
    jsonb_build_object(
      'payment_reference', coalesce(v_reference, v_invoice.payment_reference),
      'payment_provider', coalesce(v_provider, v_invoice.payment_provider)
    )
  );

  return jsonb_build_object(
    'invoice_id', v_invoice.id,
    'status', 'under_review',
    'changed', v_changed
  );
end;
$$;
