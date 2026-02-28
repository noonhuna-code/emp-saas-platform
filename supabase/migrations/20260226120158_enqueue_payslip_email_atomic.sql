-- ============================================
-- Migration: 20260226120158_enqueue_payslip_email_atomic.sql
-- Purpose: Atomically enqueue a payslip email and persist delivery dispatch linkage
-- Scope: New SECURITY INVOKER function only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None (relies on existing RLS + new dispatch table RLS)
-- ============================================

create or replace function public.enqueue_payslip_email_atomic(
  p_payroll_entry_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_actor_profile_id uuid;
  v_entry_id uuid;
  v_run_id uuid;
  v_run_status text;
  v_run_locked boolean;
  v_year integer;
  v_month integer;
  v_recipient_user_id uuid;
  v_employee_name text;
  v_net_salary numeric;
  v_queue_id uuid;
  v_existing_queue_id uuid;
  v_subject text;
  v_body text;
begin
  if p_payroll_entry_id is null then
    raise exception using errcode = 'P0001', message = 'PAYSLIP_NOT_FOUND';
  end if;

  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
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

  perform pg_advisory_xact_lock(hashtext(v_company_id::text), hashtext(p_payroll_entry_id::text));

  select pe.id,
         pe.payroll_run_id,
         pe.net_salary,
         pr.status,
         pr.locked,
         pr.year,
         pr.month,
         recipient.user_id,
         coalesce(recipient.full_name, 'Employee')
    into v_entry_id,
         v_run_id,
         v_net_salary,
         v_run_status,
         v_run_locked,
         v_year,
         v_month,
         v_recipient_user_id,
         v_employee_name
    from public.payroll_entries pe
    join public.payroll_runs pr
      on pr.id = pe.payroll_run_id
     and pr.company_id = v_company_id
     and pr.is_deleted = false
    join public.employees e
      on e.id = pe.employee_id
     and e.company_id = v_company_id
     and e.is_deleted = false
    left join public.user_profiles recipient
      on recipient.id = e.user_profile_id
     and recipient.company_id = v_company_id
     and recipient.is_deleted = false
   where pe.id = p_payroll_entry_id
     and pe.company_id = v_company_id
     and pe.is_deleted = false
   limit 1;

  if v_entry_id is null or v_run_id is null then
    raise exception using errcode = 'P0001', message = 'PAYSLIP_NOT_FOUND';
  end if;

  if coalesce(v_run_locked, false) = false or coalesce(v_run_status, '') not in ('finalized', 'paid', 'archived') then
    raise exception using errcode = 'P0001', message = 'PAYROLL_RUN_NOT_READY';
  end if;

  if v_recipient_user_id is null then
    raise exception using errcode = 'P0001', message = 'PAYSLIP_EMAIL_RECIPIENT_NOT_FOUND';
  end if;

  select ped.email_queue_id
    into v_existing_queue_id
    from public.payroll_payslip_email_dispatches ped
    join public.email_queue eq
      on eq.id = ped.email_queue_id
     and eq.company_id = v_company_id
     and eq.is_deleted = false
   where ped.company_id = v_company_id
     and ped.payroll_run_id = v_run_id
     and ped.payroll_entry_id = v_entry_id
     and eq.status = 'pending'
   order by ped.created_at desc
   limit 1;

  if v_existing_queue_id is not null then
    return jsonb_build_object(
      'queue_id', v_existing_queue_id,
      'entry_id', v_entry_id,
      'payroll_run_id', v_run_id,
      'status', 'existing_pending'
    );
  end if;

  v_subject := format(
    'Payslip available for %s %s',
    to_char(make_date(v_year, v_month, 1), 'FMMonth'),
    v_year
  );

  v_body := format(
    E'Hello %s,\n\nYour payslip for %s-%s is available in the employee portal.\nNet salary snapshot: %s\nPayroll status: %s%s\n\nPlease sign in to view or download the official payslip.\n\nThis message was queued by payroll operations.',
    v_employee_name,
    v_year,
    lpad(v_month::text, 2, '0'),
    coalesce(v_net_salary, 0)::text,
    v_run_status,
    case when v_run_locked then ' (Locked)' else '' end
  );

  insert into public.email_queue (
    company_id,
    recipient_user_id,
    subject,
    body,
    status,
    retry_count,
    created_by,
    updated_by
  ) values (
    v_company_id,
    v_recipient_user_id,
    v_subject,
    v_body,
    'pending',
    0,
    v_actor_profile_id,
    v_actor_profile_id
  )
  returning id into v_queue_id;

  if v_queue_id is null then
    raise exception using errcode = 'P0001', message = 'PAYSLIP_EMAIL_QUEUE_FAILED';
  end if;

  insert into public.payroll_payslip_email_dispatches (
    company_id,
    payroll_run_id,
    payroll_entry_id,
    email_queue_id,
    queued_by_profile_id
  ) values (
    v_company_id,
    v_run_id,
    v_entry_id,
    v_queue_id,
    v_actor_profile_id
  );

  insert into public.approval_audit_log (
    company_id,
    entity_type,
    entity_id,
    actor_profile_id,
    action
  ) values (
    v_company_id,
    'payslip',
    v_entry_id,
    v_actor_profile_id,
    'queue_payslip_email'
  );

  return jsonb_build_object(
    'queue_id', v_queue_id,
    'entry_id', v_entry_id,
    'payroll_run_id', v_run_id,
    'status', 'queued'
  );
end;
$$;

