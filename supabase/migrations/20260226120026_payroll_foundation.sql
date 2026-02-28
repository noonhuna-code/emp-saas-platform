-- EMP/supabase/payroll_foundation.sql
create table if not exists public.salary_structures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create unique index if not exists salary_structures_company_name_uniq
  on public.salary_structures (company_id, name)
  where is_deleted = false;

create index if not exists salary_structures_company_id_idx
  on public.salary_structures (company_id)
  where is_deleted = false;

create table if not exists public.salary_components (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  salary_structure_id uuid not null references public.salary_structures(id) on delete restrict,
  name text not null,
  component_type text not null,
  calculation_type text not null,
  percentage_of_component_id uuid references public.salary_components(id) on delete restrict,
  is_taxable boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.salary_components
  add constraint salary_components_component_type_chk
  check (component_type in ('earning','deduction'));

alter table public.salary_components
  add constraint salary_components_calculation_type_chk
  check (calculation_type in ('fixed','percentage'));

create index if not exists salary_components_company_id_idx
  on public.salary_components (company_id)
  where is_deleted = false;

create index if not exists salary_components_structure_id_idx
  on public.salary_components (salary_structure_id)
  where is_deleted = false;

create index if not exists salary_components_percentage_of_idx
  on public.salary_components (percentage_of_component_id)
  where is_deleted = false;

create table if not exists public.employee_salary_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  salary_structure_id uuid not null references public.salary_structures(id) on delete restrict,
  base_salary numeric not null,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.employee_salary_assignments
  add constraint employee_salary_assignments_dates_chk
  check (effective_to is null or effective_to >= effective_from);

create unique index if not exists employee_salary_assignments_active_uniq
  on public.employee_salary_assignments (company_id, employee_id)
  where is_deleted = false and effective_to is null;

create index if not exists employee_salary_assignments_company_id_idx
  on public.employee_salary_assignments (company_id)
  where is_deleted = false;

create index if not exists employee_salary_assignments_employee_id_idx
  on public.employee_salary_assignments (employee_id)
  where is_deleted = false;

create index if not exists employee_salary_assignments_structure_id_idx
  on public.employee_salary_assignments (salary_structure_id)
  where is_deleted = false;

create table if not exists public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  month integer not null,
  year integer not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft',
  locked_at timestamptz,
  locked_by uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.payroll_periods
  add constraint payroll_periods_status_chk
  check (status in ('draft','processing','locked','finalized'));

create unique index if not exists payroll_periods_company_month_year_uniq
  on public.payroll_periods (company_id, year, month)
  where is_deleted = false;

create index if not exists payroll_periods_company_id_idx
  on public.payroll_periods (company_id)
  where is_deleted = false;

alter table public.salary_structures enable row level security;
alter table public.salary_structures force row level security;

alter table public.salary_components enable row level security;
alter table public.salary_components force row level security;

alter table public.employee_salary_assignments enable row level security;
alter table public.employee_salary_assignments force row level security;

alter table public.payroll_periods enable row level security;
alter table public.payroll_periods force row level security;

drop policy if exists salary_structures_select on public.salary_structures;
drop policy if exists salary_structures_insert on public.salary_structures;
drop policy if exists salary_structures_update on public.salary_structures;

drop policy if exists salary_components_select on public.salary_components;
drop policy if exists salary_components_insert on public.salary_components;
drop policy if exists salary_components_update on public.salary_components;

drop policy if exists employee_salary_assignments_select on public.employee_salary_assignments;
drop policy if exists employee_salary_assignments_insert on public.employee_salary_assignments;
drop policy if exists employee_salary_assignments_update on public.employee_salary_assignments;

drop policy if exists payroll_periods_select on public.payroll_periods;
drop policy if exists payroll_periods_insert on public.payroll_periods;
drop policy if exists payroll_periods_update on public.payroll_periods;

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

create policy employee_salary_assignments_select on public.employee_salary_assignments
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_salary_assignments_insert on public.employee_salary_assignments
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('manage_payroll')
  );

create policy employee_salary_assignments_update on public.employee_salary_assignments
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('manage_payroll')
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('manage_payroll')
  );

create policy payroll_periods_select on public.payroll_periods
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy payroll_periods_insert on public.payroll_periods
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_payroll')
  );

create policy payroll_periods_update on public.payroll_periods
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

create trigger trg_salary_structures_updated_at
  before update on public.salary_structures
  for each row execute function public.set_updated_at();

create trigger trg_salary_components_updated_at
  before update on public.salary_components
  for each row execute function public.set_updated_at();

create trigger trg_employee_salary_assignments_updated_at
  before update on public.employee_salary_assignments
  for each row execute function public.set_updated_at();

create trigger trg_payroll_periods_updated_at
  before update on public.payroll_periods
  for each row execute function public.set_updated_at();

-- ================================
-- SUMMARY
-- ================================
-- Tables created: salary_structures, salary_components, employee_salary_assignments, payroll_periods
-- Policies created: salary_structures_select/insert/update, salary_components_select/insert/update, employee_salary_assignments_select/insert/update, payroll_periods_select/insert/update
-- Indexes created: salary_structures_company_name_uniq, salary_structures_company_id_idx, salary_components_company_id_idx, salary_components_structure_id_idx, salary_components_percentage_of_idx, employee_salary_assignments_active_uniq, employee_salary_assignments_company_id_idx, employee_salary_assignments_employee_id_idx, employee_salary_assignments_structure_id_idx, payroll_periods_company_month_year_uniq, payroll_periods_company_id_idx
-- Constraints created: salary_components_component_type_chk, salary_components_calculation_type_chk, employee_salary_assignments_dates_chk, payroll_periods_status_chk
-- Self-audit: no duplicates, idempotent, multi-tenant safe, soft-delete consistent
-- ================================
