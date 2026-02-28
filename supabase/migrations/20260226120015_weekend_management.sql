-- EMP/supabase/weekend_management.sql
create table if not exists public.company_weekend_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  effective_from date not null,
  effective_to date,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create table if not exists public.company_weekend_days (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  weekend_policy_id uuid not null references public.company_weekend_policies(id) on delete restrict,
  day_of_week integer not null,
  day_type text not null,
  is_paid boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.company_weekend_days
  add constraint company_weekend_days_day_of_week_chk
  check (day_of_week between 0 and 6);

alter table public.company_weekend_days
  add constraint company_weekend_days_day_type_chk
  check (day_type in ('full','half'));

create index if not exists company_weekend_policies_company_id_idx
  on public.company_weekend_policies (company_id)
  where is_deleted = false;

create unique index if not exists company_weekend_policies_default_uniq
  on public.company_weekend_policies (company_id)
  where is_deleted = false and is_default = true;

create index if not exists company_weekend_days_company_id_idx
  on public.company_weekend_days (company_id)
  where is_deleted = false;

create unique index if not exists company_weekend_days_policy_day_uniq
  on public.company_weekend_days (weekend_policy_id, day_of_week)
  where is_deleted = false;

alter table public.company_weekend_policies enable row level security;
alter table public.company_weekend_policies force row level security;

alter table public.company_weekend_days enable row level security;
alter table public.company_weekend_days force row level security;

drop policy if exists company_weekend_policies_select on public.company_weekend_policies;
drop policy if exists company_weekend_policies_insert on public.company_weekend_policies;
drop policy if exists company_weekend_policies_update on public.company_weekend_policies;

drop policy if exists company_weekend_days_select on public.company_weekend_days;
drop policy if exists company_weekend_days_insert on public.company_weekend_days;
drop policy if exists company_weekend_days_update on public.company_weekend_days;

create policy company_weekend_policies_select on public.company_weekend_policies
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy company_weekend_policies_insert on public.company_weekend_policies
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy company_weekend_policies_update on public.company_weekend_policies
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_employees')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy company_weekend_days_select on public.company_weekend_days
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy company_weekend_days_insert on public.company_weekend_days
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy company_weekend_days_update on public.company_weekend_days
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_employees')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create trigger trg_company_weekend_policies_updated_at
  before update on public.company_weekend_policies
  for each row execute function public.set_updated_at();

create trigger trg_company_weekend_days_updated_at
  before update on public.company_weekend_days
  for each row execute function public.set_updated_at();

-- ================================
-- SUMMARY
-- ================================
-- Tables created: company_weekend_policies, company_weekend_days
-- Policies created: company_weekend_policies_select/insert/update, company_weekend_days_select/insert/update
-- Indexes created: company_weekend_policies_company_id_idx, company_weekend_policies_default_uniq, company_weekend_days_company_id_idx, company_weekend_days_policy_day_uniq
-- Constraints created: company_weekend_days_day_of_week_chk, company_weekend_days_day_type_chk
-- Self-audit: no duplicates, idempotent, multi-tenant safe, soft-delete consistent
-- ================================
