-- EMP/supabase/phase2_05_payslip_engine.sql

create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  payroll_entry_id uuid not null references public.payroll_entries(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  snapshot_json jsonb not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create unique index if not exists payslips_payroll_entry_uniq
  on public.payslips (payroll_entry_id)
  where is_deleted = false;

create index if not exists payslips_company_id_idx
  on public.payslips (company_id)
  where is_deleted = false;

create index if not exists payslips_employee_id_idx
  on public.payslips (employee_id)
  where is_deleted = false;

create or replace function public.generate_payslip(p_payroll_entry_id uuid)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_entry record;
  v_month record;
  v_existing uuid;
  v_snapshot jsonb;
begin
  select p.id into v_existing
  from public.payslips p
  where p.payroll_entry_id = p_payroll_entry_id
    and p.is_deleted = false
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  select e.*, pe.company_id
    into v_entry
    from public.payroll_entries pe
    join public.employees e on e.id = pe.employee_id
    where pe.id = p_payroll_entry_id
      and pe.is_deleted = false
      and e.is_deleted = false
    limit 1;

  if v_entry is null then
    raise exception 'Payroll entry not found';
  end if;

  select pm.* into v_month
    from public.payroll_months pm
    where pm.id = v_entry.payroll_month_id
      and pm.company_id = v_entry.company_id
      and pm.is_deleted = false
    limit 1;

  if v_month is null or v_month.status <> 'finalized' then
    raise exception 'Payslip can only be generated for finalized payroll months';
  end if;

  v_snapshot := jsonb_build_object(
    'payroll_entry_id', p_payroll_entry_id,
    'employee_id', v_entry.id,
    'company_id', v_entry.company_id,
    'base_salary', (select base_salary_snapshot from public.payroll_entries where id = p_payroll_entry_id),
    'total_allowances', (select total_allowances from public.payroll_entries where id = p_payroll_entry_id),
    'total_deductions', (select total_deductions from public.payroll_entries where id = p_payroll_entry_id),
    'net_salary', (select net_salary from public.payroll_entries where id = p_payroll_entry_id)
  );

  insert into public.payslips (
    company_id,
    payroll_entry_id,
    employee_id,
    snapshot_json,
    created_by
  ) values (
    v_entry.company_id,
    p_payroll_entry_id,
    v_entry.id,
    v_snapshot,
    (select id from public.user_profiles where user_id = auth.uid())
  )
  returning id into v_existing;

  return v_existing;
end;
$$;

-- ============================================
-- PHASE 2 PAYROLL ENGINE SUMMARY
-- Tables created: payslips
-- Constraints added: payslips_payroll_entry_uniq
-- Functions created: generate_payslip
-- RLS policies added: none (handled in phase2_06_payroll_rls.sql)
-- ============================================
