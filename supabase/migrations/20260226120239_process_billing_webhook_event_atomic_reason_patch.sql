-- ============================================
-- Migration: 20260226120239_process_billing_webhook_event_atomic_reason_patch.sql
-- Purpose : Pass explicit approval reason on webhook-paid transitions
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.process_billing_webhook_event_atomic(
  p_company_id uuid,
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_payload_json jsonb default '{}'::jsonb,
  p_payload_hash text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_company_id uuid;
  v_actor_profile_id uuid;
  v_provider text;
  v_event_type text;
  v_hash text;
  v_webhook_id uuid;
  v_existing_status text;
  v_existing_company_id uuid;
  v_invoice_id uuid;
  v_invoice_number text;
  v_payment_reference text;
  v_payment_provider text;
  v_payment_amount_minor bigint;
  v_payment_currency text;
  v_payment_result jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_session_company_id := public.current_user_company_id();
  if v_session_company_id is null or p_company_id is null or p_company_id <> v_session_company_id then
    raise exception using errcode = 'P0001', message = 'TENANT_MISMATCH';
  end if;

  if not (
    public.current_user_has_permission('approve_billing_payments')
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
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

  v_provider := lower(nullif(trim(coalesce(p_provider, '')), ''));
  v_event_type := lower(nullif(trim(coalesce(p_event_type, '')), ''));
  v_hash := coalesce(nullif(trim(coalesce(p_payload_hash, '')), ''), md5(coalesce(p_payload_json::text, '{}')));

  if v_provider is null then
    raise exception using errcode = 'P0001', message = 'INVALID_WEBHOOK_PROVIDER';
  end if;
  if v_event_type is null then
    raise exception using errcode = 'P0001', message = 'INVALID_WEBHOOK_EVENT';
  end if;
  if nullif(trim(coalesce(p_provider_event_id, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'INVALID_WEBHOOK_EVENT';
  end if;

  begin
    insert into public.billing_webhook_events (
      company_id,
      provider,
      provider_event_id,
      event_type,
      payload_json,
      payload_hash,
      process_status,
      processed,
      received_at
    )
    values (
      p_company_id,
      v_provider,
      trim(p_provider_event_id),
      v_event_type,
      coalesce(p_payload_json, '{}'::jsonb),
      v_hash,
      'received',
      false,
      now()
    )
    returning id into v_webhook_id;
  exception
    when unique_violation then
      select bwe.id, bwe.process_status, bwe.company_id
        into v_webhook_id, v_existing_status, v_existing_company_id
      from public.billing_webhook_events bwe
      where bwe.provider = v_provider
        and bwe.provider_event_id = trim(p_provider_event_id)
      limit 1
      for update;

      if v_webhook_id is null then
        raise exception using errcode = 'P0001', message = 'WEBHOOK_PERSISTENCE_FAILED';
      end if;

      if v_existing_company_id <> p_company_id then
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
         set payload_json = coalesce(p_payload_json, payload_json),
             payload_hash = coalesce(v_hash, payload_hash),
             process_status = 'received',
             processed = false
       where id = v_webhook_id;
  end;

  v_invoice_id := null;
  begin
    if nullif(trim(coalesce(p_payload_json ->> 'invoice_id', '')), '') is not null then
      v_invoice_id := (p_payload_json ->> 'invoice_id')::uuid;
    end if;
  exception
    when others then
      v_invoice_id := null;
  end;

  v_invoice_number := nullif(trim(coalesce(p_payload_json ->> 'invoice_number', '')), '');
  if v_invoice_id is null and v_invoice_number is not null then
    select bi.id
      into v_invoice_id
    from public.billing_invoices bi
    where bi.company_id = p_company_id
      and bi.invoice_number = v_invoice_number
    order by bi.created_at desc
    limit 1;
  end if;

  if v_invoice_id is null then
    update public.billing_webhook_events
       set process_status = 'ignored',
           processed = true,
           processed_at = now()
     where id = v_webhook_id;

    return jsonb_build_object(
      'webhook_id', v_webhook_id,
      'process_status', 'ignored',
      'reason', 'invoice_unresolved'
    );
  end if;

  v_payment_reference := nullif(trim(coalesce(p_payload_json ->> 'payment_reference', '')), '');
  v_payment_provider := coalesce(nullif(trim(coalesce(p_payload_json ->> 'payment_provider', '')), ''), v_provider);
  v_payment_amount_minor := nullif(trim(coalesce(p_payload_json ->> 'payment_amount_minor', '')), '')::bigint;
  v_payment_currency := upper(nullif(trim(coalesce(p_payload_json ->> 'payment_currency_code', '')), ''));

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
      v_payment_amount_minor,
      v_payment_currency,
      v_payment_reference,
      v_payment_provider,
      now(),
      'Webhook verified payment'
    );

    update public.billing_webhook_events
       set process_status = 'processed',
           processed = true,
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
           processed = true,
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
         processed = true,
         processed_at = now()
   where id = v_webhook_id;

  return jsonb_build_object(
    'webhook_id', v_webhook_id,
    'process_status', 'ignored',
    'reason', 'event_ignored'
  );
exception
  when others then
    if v_webhook_id is not null then
      update public.billing_webhook_events
         set process_status = 'failed',
             processed = false,
             processed_at = now()
       where id = v_webhook_id;
    end if;
    raise;
end;
$$;
