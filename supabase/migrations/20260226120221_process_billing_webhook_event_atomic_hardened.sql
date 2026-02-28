-- ============================================
-- Migration: 20260226120221_process_billing_webhook_event_atomic_hardened.sql
-- Purpose : Transactional webhook ingestion with strict paid verification wiring
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.process_billing_webhook_event_atomic(
  p_company_id uuid,
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_payload_json jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_company_id uuid;
  v_webhook_id uuid;
  v_existing_status text;
  v_existing_company_id uuid;
  v_invoice_id uuid;
  v_invoice_number text;
  v_payment_reference text;
  v_payment_provider text;
  v_event_type text;
  v_payment_result jsonb;
  v_paid_amount_minor bigint;
  v_paid_currency_code text;
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

  if nullif(trim(coalesce(p_provider, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'INVALID_WEBHOOK_PROVIDER';
  end if;
  if nullif(trim(coalesce(p_provider_event_id, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'INVALID_WEBHOOK_EVENT';
  end if;
  if nullif(trim(coalesce(p_event_type, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'INVALID_WEBHOOK_EVENT';
  end if;

  begin
    insert into public.billing_webhook_events (
      company_id,
      provider,
      provider_event_id,
      event_type,
      payload_json,
      process_status,
      received_at
    )
    values (
      p_company_id,
      trim(p_provider),
      trim(p_provider_event_id),
      trim(p_event_type),
      coalesce(p_payload_json, '{}'::jsonb),
      'received',
      now()
    )
    returning id into v_webhook_id;
  exception when unique_violation then
    select bwe.id, bwe.process_status, bwe.company_id
      into v_webhook_id, v_existing_status, v_existing_company_id
    from public.billing_webhook_events bwe
    where bwe.provider = trim(p_provider)
      and bwe.provider_event_id = trim(p_provider_event_id)
    limit 1
    for update;

    if v_webhook_id is null then
      raise exception using errcode = 'P0001', message = 'WEBHOOK_PERSISTENCE_FAILED';
    end if;
    if v_existing_company_id is not null and v_existing_company_id <> p_company_id then
      raise exception using errcode = 'P0001', message = 'TENANT_MISMATCH';
    end if;

    if v_existing_status = 'processed' then
      return jsonb_build_object(
        'webhook_id', v_webhook_id,
        'process_status', 'processed',
        'duplicate', true
      );
    end if;

    update public.billing_webhook_events
       set company_id = coalesce(company_id, p_company_id),
           payload_json = coalesce(p_payload_json, payload_json),
           process_status = 'received',
           process_error = null
     where id = v_webhook_id;
  end;

  v_event_type := lower(trim(p_event_type));
  v_invoice_id := null;

  begin
    if nullif(trim(coalesce(p_payload_json ->> 'invoice_id', '')), '') is not null then
      v_invoice_id := (p_payload_json ->> 'invoice_id')::uuid;
    end if;
  exception when others then
    v_invoice_id := null;
  end;

  v_invoice_number := nullif(trim(coalesce(p_payload_json ->> 'invoice_number', '')), '');
  if v_invoice_id is null and v_invoice_number is not null then
    select bi.id
      into v_invoice_id
    from public.billing_invoices bi
    where bi.company_id = p_company_id
      and bi.invoice_number = v_invoice_number
    limit 1;
  end if;

  if v_invoice_id is null then
    update public.billing_webhook_events
       set process_status = 'ignored',
           process_error = null,
           processed_at = now()
     where id = v_webhook_id;

    return jsonb_build_object(
      'webhook_id', v_webhook_id,
      'process_status', 'ignored',
      'reason', 'invoice_unresolved'
    );
  end if;

  v_payment_reference := nullif(trim(coalesce(p_payload_json ->> 'payment_reference', '')), '');
  v_payment_provider := nullif(trim(coalesce(p_payload_json ->> 'payment_provider', p_provider)), '');

  begin
    if nullif(trim(coalesce(p_payload_json ->> 'paid_amount_minor', p_payload_json ->> 'amount_minor')), '') is not null then
      v_paid_amount_minor := (coalesce(p_payload_json ->> 'paid_amount_minor', p_payload_json ->> 'amount_minor'))::bigint;
    else
      v_paid_amount_minor := null;
    end if;
  exception when others then
    v_paid_amount_minor := null;
  end;

  v_paid_currency_code := upper(nullif(trim(coalesce(p_payload_json ->> 'paid_currency_code', p_payload_json ->> 'currency')), ''));

  if v_event_type in ('payment_success', 'payment.captured', 'invoice.paid', 'jazzcash.payment.success') then
    perform public.mark_billing_invoice_under_review_atomic(
      p_company_id,
      v_invoice_id,
      v_payment_reference,
      v_payment_provider
    );

    v_payment_result := public.mark_billing_invoice_paid_atomic(
      p_company_id,
      v_invoice_id,
      v_paid_amount_minor,
      v_paid_currency_code,
      v_payment_reference,
      v_payment_provider,
      now()
    );

    update public.billing_webhook_events
       set process_status = 'processed',
           process_error = null,
           processed_at = now()
     where id = v_webhook_id;

    return jsonb_build_object(
      'webhook_id', v_webhook_id,
      'process_status', 'processed',
      'duplicate', false,
      'result', v_payment_result
    );
  end if;

  if v_event_type in ('payment_pending_review', 'payment.pending_review', 'bank_transfer.submitted', 'invoice.under_review') then
    v_payment_result := public.mark_billing_invoice_under_review_atomic(
      p_company_id,
      v_invoice_id,
      v_payment_reference,
      v_payment_provider
    );

    update public.billing_webhook_events
       set process_status = 'processed',
           process_error = null,
           processed_at = now()
     where id = v_webhook_id;

    return jsonb_build_object(
      'webhook_id', v_webhook_id,
      'process_status', 'processed',
      'duplicate', false,
      'result', v_payment_result
    );
  end if;

  update public.billing_webhook_events
     set process_status = 'ignored',
         process_error = null,
         processed_at = now()
   where id = v_webhook_id;

  return jsonb_build_object(
    'webhook_id', v_webhook_id,
    'process_status', 'ignored',
    'reason', 'unsupported_event'
  );
exception when others then
  if v_webhook_id is not null then
    update public.billing_webhook_events
       set process_status = 'failed',
           process_error = left(sqlerrm, 400),
           processed_at = now()
     where id = v_webhook_id;
  end if;
  raise exception using errcode = 'P0001', message = 'WEBHOOK_PROCESSING_FAILED';
end;
$$;
