-- EMP/supabase/phase2_06_payroll_rls.sql

alter table public.salary_structures enable row level security;
alter table public.salary_structures force row level security;

alter table public.salary_components enable row level security;
alter table public.salary_components force row level security;

alter table public.payroll_months enable row level security;
alter table public.payroll_months force row level security;

alter table public.payroll_entries enable row level security;
alter table public.payroll_entries force row level security;

alter table public.salary_ledger enable row level security;
alter table public.salary_ledger force row level security;

alter table public.payslips enable row level security;
alter table public.payslips force row level security;

drop policy if exists salary_structures_select on public.salary_structures;
drop policy if exists salary_structures_insert on public.salary_structures;
drop policy if exists salary_structures_update on public.salary_structures;

drop policy if exists salary_components_select on public.salary_components;
drop policy if exists salary_components_insert on public.salary_components;
drop policy if exists salary_components_update on public.salary_components;

drop policy if exists payroll_months_select on public.payroll_months;
drop policy if exists payroll_months_insert on public.payroll_months;
drop policy if exists payroll_months_update on public.payroll_months;

drop policy if exists payroll_entries_select on public.payroll_entries;
drop policy if exists payroll_entries_insert on public.payroll_entries;
drop policy if exists payroll_entries_update on public.payroll_entries;

drop policy if exists salary_ledger_select on public.salary_ledger;
drop policy if exists salary_ledger_insert on public.salary_ledger;
drop policy if exists salary_ledger_update on public.salary_ledger;

drop policy if exists payslips_select on public.payslips;
drop policy if exists payslips_insert on public.payslips;
drop policy if exists payslips_update on public.payslips;

create policy salary_structures_select on public.salary_structures
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy salary_structures_insert on public.salary_structures
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy salary_structures_update on public.salary_structures
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_payroll')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy salary_components_select on public.salary_components
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy salary_components_insert on public.salary_components
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy salary_components_update on public.salary_components
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_payroll')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy payroll_months_select on public.payroll_months
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy payroll_months_insert on public.payroll_months
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy payroll_months_update on public.payroll_months
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_payroll')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy payroll_entries_select on public.payroll_entries
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy payroll_entries_insert on public.payroll_entries
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy payroll_entries_update on public.payroll_entries
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_payroll')
    and exists (
      select 1 from public.payroll_months pm
      where pm.id = payroll_month_id
        and pm.company_id = company_id
        and pm.is_deleted = false
        and pm.is_locked = false
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
    and exists (
      select 1 from public.payroll_months pm
      where pm.id = payroll_month_id
        and pm.company_id = company_id
        and pm.is_deleted = false
        and pm.is_locked = false
    )
  );

create policy salary_ledger_select on public.salary_ledger
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy salary_ledger_insert on public.salary_ledger
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy salary_ledger_update on public.salary_ledger
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_payroll')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy payslips_select on public.payslips
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy payslips_insert on public.payslips
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy payslips_update on public.payslips
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_payroll')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

-- ============================================
-- PHASE 2 PAYROLL ENGINE SUMMARY
-- Tables created: none (RLS only)
-- Constraints added: none
-- Functions created: none
-- Triggers created: none
-- RLS policies added: salary_structures, salary_components, payroll_months, payroll_entries, salary_ledger, payslips
-- ============================================
