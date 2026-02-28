-- EMP/supabase/leave_management.sql
create extension if not exists btree_gist;

create table if not exists public.leave_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  description text,
  is_paid boolean not null default true,
  gender_restriction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create unique index if not exists leave_types_company_name_uniq
  on public.leave_types (company_id, name)
  where is_deleted = false;

create index if not exists leave_types_company_id_idx
  on public.leave_types (company_id)
  where is_deleted = false;

create table if not exists public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  year integer not null,
  entitled_days numeric not null default 0,
  used_days numeric not null default 0,
  remaining_days numeric generated always as (entitled_days - used_days) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create unique index if not exists leave_balances_company_employee_type_year_uniq
  on public.leave_balances (company_id, employee_id, leave_type_id, year)
  where is_deleted = false;

create index if not exists leave_balances_company_id_idx
  on public.leave_balances (company_id)
  where is_deleted = false;

create index if not exists leave_balances_employee_id_idx
  on public.leave_balances (employee_id)
  where is_deleted = false;

create index if not exists leave_balances_leave_type_id_idx
  on public.leave_balances (leave_type_id)
  where is_deleted = false;

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  total_days numeric not null,
  reason text,
  status text not null default 'pending',
  applied_by uuid references public.user_profiles(id) on delete restrict,
  approved_by uuid references public.user_profiles(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.leave_requests
  add constraint leave_requests_status_chk
  check (status in ('pending','approved','rejected','cancelled'));

alter table public.leave_requests
  add constraint leave_requests_date_chk
  check (end_date >= start_date);

create index if not exists leave_requests_company_id_idx
  on public.leave_requests (company_id)
  where is_deleted = false;

create index if not exists leave_requests_employee_id_idx
  on public.leave_requests (employee_id)
  where is_deleted = false;

create index if not exists leave_requests_status_idx
  on public.leave_requests (status)
  where is_deleted = false;

create index if not exists leave_requests_start_date_idx
  on public.leave_requests (start_date)
  where is_deleted = false;

create index if not exists leave_requests_end_date_idx
  on public.leave_requests (end_date)
  where is_deleted = false;

alter table public.leave_requests
  add constraint leave_requests_no_overlap
  exclude using gist (
    company_id with =,
    employee_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
  where (is_deleted = false and status in ('pending','approved'));

alter table public.leave_types enable row level security;
alter table public.leave_types force row level security;

alter table public.leave_balances enable row level security;
alter table public.leave_balances force row level security;

alter table public.leave_requests enable row level security;
alter table public.leave_requests force row level security;

drop policy if exists leave_types_select on public.leave_types;
drop policy if exists leave_types_insert on public.leave_types;
drop policy if exists leave_types_update on public.leave_types;

drop policy if exists leave_balances_select on public.leave_balances;
drop policy if exists leave_balances_insert on public.leave_balances;
drop policy if exists leave_balances_update on public.leave_balances;

drop policy if exists leave_requests_select on public.leave_requests;
drop policy if exists leave_requests_insert on public.leave_requests;
drop policy if exists leave_requests_update on public.leave_requests;

create policy leave_types_select on public.leave_types
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy leave_types_insert on public.leave_types
  for insert
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_employees'));

create policy leave_types_update on public.leave_types
  for update
  using (company_id = public.current_user_company_id() and is_deleted = false and public.current_user_has_permission('manage_employees'))
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_employees'));

create policy leave_balances_select on public.leave_balances
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy leave_balances_insert on public.leave_balances
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('manage_employees')
  );

create policy leave_balances_update on public.leave_balances
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('manage_employees')
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('manage_employees')
  );

create policy leave_requests_select on public.leave_requests
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy leave_requests_insert on public.leave_requests
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id = public.current_user_employee_id()
    and applied_by = (select id from public.user_profiles where user_id = auth.uid())
  );

create policy leave_requests_update on public.leave_requests
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('manage_employees')
      or (
        employee_id = public.current_user_employee_id()
        and status = 'pending'
        and exists (
          select 1 from public.leave_requests lr
          where lr.id = id
            and lr.status = 'pending'
            and lr.is_deleted = false
        )
      )
    )
  );

create trigger trg_leave_types_updated_at
  before update on public.leave_types
  for each row execute function public.set_updated_at();

create trigger trg_leave_balances_updated_at
  before update on public.leave_balances
  for each row execute function public.set_updated_at();

create trigger trg_leave_requests_updated_at
  before update on public.leave_requests
  for each row execute function public.set_updated_at();
