create table if not exists public.employee_break_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  break_name text,
  break_start_time time not null,
  break_end_time time not null,
  effective_from date not null,
  effective_to date,
  assigned_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict,
  constraint employee_break_assignments_time_check check (break_end_time > break_start_time),
  constraint employee_break_assignments_date_check check (effective_to is null or effective_to >= effective_from)
);

create index if not exists employee_break_assignments_company_id_idx
  on public.employee_break_assignments (company_id)
  where is_deleted = false;

create index if not exists employee_break_assignments_employee_id_idx
  on public.employee_break_assignments (employee_id)
  where is_deleted = false;

create index if not exists employee_break_assignments_effective_from_idx
  on public.employee_break_assignments (effective_from)
  where is_deleted = false;

alter table public.employee_break_assignments enable row level security;
alter table public.employee_break_assignments force row level security;

drop policy if exists employee_break_assignments_select on public.employee_break_assignments;
drop policy if exists employee_break_assignments_insert on public.employee_break_assignments;
drop policy if exists employee_break_assignments_update on public.employee_break_assignments;

create policy employee_break_assignments_select on public.employee_break_assignments
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_break_assignments_insert on public.employee_break_assignments
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_break_assignments_update on public.employee_break_assignments
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

drop trigger if exists trg_employee_break_assignments_updated_at on public.employee_break_assignments;
create trigger trg_employee_break_assignments_updated_at
  before update on public.employee_break_assignments
  for each row execute function public.set_updated_at();
