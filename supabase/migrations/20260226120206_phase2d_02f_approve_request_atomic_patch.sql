-- Phase 2D Stage 2A approve request RPC patch (atomic approval + schedule seeding + advisory lock)
create or replace function public.approve_financial_obligation_request_atomic(
  p_request_id uuid,
  p_principal_approved numeric,
  p_term_months_approved integer default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_actor_profile_id uuid;
  v_request record;
  v_obligation_id uuid;
  v_approved_term integer;
  v_old_request_status text;
  v_schedule_count integer := 0;
  v_start_period date;
  v_base_amount numeric;
  v_scheduled_amount numeric;
  v_i integer;
  v_period_date date;
  v_lock_key text;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  if p_request_id is null then
    raise exception using errcode = 'P0001', message = 'FINANCIAL_OBLIGATION_REQUEST_NOT_FOUND';
  end if;

  if p_principal_approved is null or p_principal_approved <= 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_APPROVED_AMOUNT';
  end if;

  if p_term_months_approved is not null and p_term_months_approved <= 0 then
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

  v_lock_key := format('company:%s:request:%s', v_company_id, p_request_id);
  if not pg_try_advisory_xact_lock(42020, hashtext(v_lock_key)) then
    raise exception using errcode = 'P0001', message = 'REQUEST_LOCK_CONFLICT';
  end if;

  select r.*
    into v_request
    from public.financial_obligation_requests r
    join public.employees e
      on e.id = r.employee_id
     and e.company_id = v_company_id
     and e.is_deleted = false
   where r.id = p_request_id
     and r.company_id = v_company_id
   for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'FINANCIAL_OBLIGATION_REQUEST_NOT_FOUND';
  end if;

  if v_request.status not in ('submitted', 'under_review') then
    raise exception using errcode = 'P0001', message = 'APPROVAL_NOT_PENDING';
  end if;

  v_approved_term := coalesce(p_term_months_approved, v_request.requested_term_months);

  if v_request.obligation_type = 'loan' and (v_approved_term is null or v_approved_term <= 0) then
    raise exception using errcode = 'P0001', message = 'INVALID_TERM';
  end if;

  if v_request.obligation_type = 'advance' and (v_approved_term is null or v_approved_term <= 0) then
    v_approved_term := 1;
  end if;

  v_old_request_status := v_request.status;

  update public.financial_obligation_requests
     set status = 'approved',
         reviewed_by_profile_id = v_actor_profile_id,
         reviewed_at = now(),
         updated_by_profile_id = v_actor_profile_id,
         updated_at = now()
   where id = p_request_id
     and company_id = v_company_id;

  insert into public.financial_obligations (
    company_id,
    employee_id,
    source_request_id,
    obligation_type,
    obligation_status,
    currency_code,
    principal_requested,
    principal_approved,
    outstanding_balance,
    term_months_requested,
    term_months_approved,
    created_by_profile_id,
    updated_by_profile_id
  ) values (
    v_company_id,
    v_request.employee_id,
    v_request.id,
    v_request.obligation_type,
    'approved_pending_disbursement',
    v_request.currency_code,
    v_request.requested_amount,
    p_principal_approved,
    p_principal_approved,
    v_request.requested_term_months,
    v_approved_term,
    v_actor_profile_id,
    v_actor_profile_id
  )
  returning id into v_obligation_id;

  if v_obligation_id is null then
    raise exception using errcode = 'P0001', message = 'OBLIGATION_CREATE_FAILED';
  end if;

  v_start_period := (date_trunc('month', current_date)::date + interval '1 month')::date;
  v_base_amount := round(p_principal_approved / v_approved_term, 2);

  for v_i in 0..(v_approved_term - 1) loop
    v_period_date := (v_start_period + make_interval(months => v_i))::date;

    if v_i = v_approved_term - 1 then
      v_scheduled_amount := p_principal_approved - (v_base_amount * (v_approved_term - 1));
    else
      v_scheduled_amount := v_base_amount;
    end if;

    insert into public.financial_obligation_installments (
      company_id,
      obligation_id,
      year,
      month,
      scheduled_amount,
      applied_amount,
      remaining_amount,
      status,
      schedule_version,
      created_by_profile_id,
      updated_by_profile_id
    ) values (
      v_company_id,
      v_obligation_id,
      extract(year from v_period_date)::integer,
      extract(month from v_period_date)::integer,
      v_scheduled_amount,
      0,
      v_scheduled_amount,
      'scheduled',
      1,
      v_actor_profile_id,
      v_actor_profile_id
    );

    v_schedule_count := v_schedule_count + 1;
  end loop;

  insert into public.financial_obligation_status_history (
    company_id,
    request_id,
    obligation_id,
    entity_scope,
    old_status,
    new_status,
    reason,
    actor_profile_id
  ) values
  (
    v_company_id,
    v_request.id,
    null,
    'request',
    v_old_request_status,
    'approved',
    null,
    v_actor_profile_id
  ),
  (
    v_company_id,
    null,
    v_obligation_id,
    'obligation',
    null,
    'approved_pending_disbursement',
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
    v_request.id,
    null,
    'request_approved',
    0,
    null,
    null,
    'request',
    v_request.id,
    v_actor_profile_id,
    jsonb_build_object(
      'request_status_before', v_old_request_status,
      'request_status_after', 'approved',
      'obligation_id', v_obligation_id,
      'schedule_count', v_schedule_count
    )
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'request_status', 'approved',
    'obligation_id', v_obligation_id,
    'obligation_status', 'approved_pending_disbursement',
    'schedule_count', v_schedule_count,
    'outstanding_balance', p_principal_approved
  );
end;
$$;

