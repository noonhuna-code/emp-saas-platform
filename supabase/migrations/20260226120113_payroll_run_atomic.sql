-- ============================================
-- Migration: 74_payroll_run_atomic.sql
-- Purpose: Atomic payroll run RPC (session-bound tenant validation)
-- Scope: New SECURITY INVOKER function
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None (relies on existing RLS)
-- ============================================

create or replace function public.run_payroll_atomic(
  p_year integer,
  p_month integer,
  p_company_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_actor_profile_id uuid;
  v_run_id uuid;
  v_existing_id uuid;
  v_start_date date;
  v_end_date date;
  v_rowcount integer;
  v_employee record;
  v_salary record;
begin
  if p_year is null or p_month is null or p_month < 1 or p_month > 12 then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_INPUT';
  end if;

  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'UNAUTHENTICATED';
  end if;

  select up.company_id, up.id
    into v_company_id, v_actor_profile_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if v_company_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'TENANT_RESOLUTION_FAILED';
  end if;

  if p_company_id is not null and p_company_id <> v_company_id then
    raise exception using
      errcode = 'P0001',
      message = 'TENANT_MISMATCH';
  end if;

  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + interval '1 month - 1 day')::date;

  insert into public.payroll_runs (
    company_id,
    month,
    year,
    start_date,
    end_date,
    status,
    locked,
    locked_at,
    created_at,
    updated_at,
    created_by,
    updated_by,
    is_deleted
  ) values (
    v_company_id,
    p_month,
    p_year,
    v_start_date,
    v_end_date,
    'processing',
    false,
    null,
    now(),
    now(),
    v_actor_profile_id,
    v_actor_profile_id,
    false
  )
  on conflict (company_id, year, month) do nothing
  returning id into v_run_id;

  if v_run_id is null then
    select id
      into v_existing_id
      from public.payroll_runs
     where company_id = v_company_id
       and year = p_year
       and month = p_month
       and is_deleted = false
     limit 1;

    if v_existing_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'PAYROLL_RUN_NOT_FOUND';
    end if;

    return jsonb_build_object(
      'payroll_run_id', v_existing_id,
      'status', 'existing'
    );
  end if;

  for v_employee in
    select e.id as employee_id
      from public.employees e
     where e.company_id = v_company_id
       and e.is_deleted = false
  loop
    select s.id, s.base_salary
      into v_salary
      from public.salary_structures s
     where s.company_id = v_company_id
       and s.employee_id = v_employee.employee_id
       and s.is_deleted = false
       and s.status in ('approved','active')
     order by s.effective_from desc nulls last
     limit 1;

    if not found then
      continue;
    end if;

    insert into public.payroll_entries (
      company_id,
      payroll_run_id,
      payroll_month_id,
      salary_structure_id,
      employee_id,
      base_salary,
      base_salary_snapshot,
      total_earnings,
      total_allowances,
      total_deductions,
      net_salary,
      is_processed,
      created_at,
      updated_at,
      created_by,
      updated_by,
      is_deleted
    ) values (
      v_company_id,
      v_run_id,
      null,
      v_salary.id,
      v_employee.employee_id,
      v_salary.base_salary,
      v_salary.base_salary,
      v_salary.base_salary,
      0,
      0,
      v_salary.base_salary,
      false,
      now(),
      now(),
      v_actor_profile_id,
      v_actor_profile_id,
      false
    );
  end loop;

  update public.payroll_runs
     set status = 'finalized',
         locked = true,
         locked_at = now(),
         updated_at = now(),
         updated_by = v_actor_profile_id
   where id = v_run_id
     and company_id = v_company_id
     and is_deleted = false
     and status = 'processing';

  get diagnostics v_rowcount = row_count;
  if v_rowcount <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'PAYROLL_RUN_FINALIZE_FAILED';
  end if;

  return jsonb_build_object(
    'payroll_run_id', v_run_id,
    'status', 'finalized'
  );
end;
$$;