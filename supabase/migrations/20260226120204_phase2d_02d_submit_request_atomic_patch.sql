-- Phase 2D Stage 2A submit request RPC patch (request-level ledger + status history)
create or replace function public.submit_financial_obligation_request_atomic(
  p_employee_id uuid,
  p_obligation_type text,
  p_requested_amount numeric,
  p_requested_term_months integer default null,
  p_currency_code text default null,
  p_reason text default null,
  p_terms_snapshot_json jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_actor_profile_id uuid;
  v_employee_company_id uuid;
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  if p_employee_id is null
     or p_obligation_type is null
     or btrim(coalesce(p_obligation_type, '')) = ''
     or p_requested_amount is null
     or p_requested_amount <= 0
     or btrim(coalesce(p_currency_code, '')) = '' then
    raise exception using errcode = 'P0001', message = 'INVALID_REQUEST_INPUT';
  end if;

  if p_obligation_type not in ('advance', 'loan') then
    raise exception using errcode = 'P0001', message = 'INVALID_REQUEST_INPUT';
  end if;

  if p_obligation_type = 'loan' and (p_requested_term_months is null or p_requested_term_months <= 0) then
    raise exception using errcode = 'P0001', message = 'INVALID_TERM';
  end if;

  if p_requested_term_months is not null and p_requested_term_months <= 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_TERM';
  end if;

  select up.company_id, up.id
    into v_company_id, v_actor_profile_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if v_company_id is null or v_actor_profile_id is null then
    raise exception using errcode = 'P0001', message = 'TENANT_RESOLUTION_FAILED';
  end if;

  select e.company_id
    into v_employee_company_id
    from public.employees e
   where e.id = p_employee_id
     and e.company_id = v_company_id
     and e.is_deleted = false
   limit 1;

  if v_employee_company_id is null then
    raise exception using errcode = 'P0001', message = 'EMPLOYEE_NOT_FOUND';
  end if;

  insert into public.financial_obligation_requests (
    company_id,
    employee_id,
    obligation_type,
    status,
    requested_amount,
    requested_term_months,
    currency_code,
    reason,
    request_payload_version,
    terms_snapshot_json,
    created_by_profile_id,
    updated_by_profile_id
  ) values (
    v_company_id,
    p_employee_id,
    p_obligation_type,
    'submitted',
    p_requested_amount,
    p_requested_term_months,
    upper(btrim(p_currency_code)),
    nullif(btrim(coalesce(p_reason, '')), ''),
    1,
    p_terms_snapshot_json,
    v_actor_profile_id,
    v_actor_profile_id
  )
  returning id into v_request_id;

  if v_request_id is null then
    raise exception using errcode = 'P0001', message = 'REQUEST_SUBMIT_FAILED';
  end if;

  insert into public.financial_obligation_status_history (
    company_id,
    request_id,
    obligation_id,
    entity_scope,
    old_status,
    new_status,
    reason,
    actor_profile_id
  ) values (
    v_company_id,
    v_request_id,
    null,
    'request',
    null,
    'submitted',
    null,
    v_actor_profile_id
  );

  insert into public.financial_obligation_ledger (
    company_id,
    request_id,
    obligation_id,
    event_type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    actor_profile_id,
    metadata_json
  ) values (
    v_company_id,
    v_request_id,
    null,
    'request_created',
    0,
    null,
    null,
    'request',
    v_request_id,
    v_actor_profile_id,
    jsonb_build_object(
      'obligation_type', p_obligation_type,
      'request_status_after', 'submitted'
    )
  );

  return jsonb_build_object(
    'request_id', v_request_id,
    'status', 'submitted'
  );
end;
$$;

