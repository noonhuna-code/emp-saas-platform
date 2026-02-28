-- ============================================
-- Migration: 55_employee_kudos_system.sql
-- Purpose: Employee kudos with anti-spam controls, monthly rate limits, and leaderboard views
-- Scope: employee_kudos table, validation/immutability triggers, RLS, leaderboard views
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Adds RLS on new table only
-- Financial Impact: None
-- ============================================

create table if not exists public.employee_kudos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  sender_employee_id uuid not null references public.employees(id) on delete restrict,
  receiver_employee_id uuid not null references public.employees(id) on delete restrict,
  points integer not null,
  message text,
  month_bucket_utc date not null default date_trunc('month', now() at time zone 'UTC')::date,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  constraint employee_kudos_points_chk check (points between 1 and 50),
  constraint employee_kudos_no_self_chk check (sender_employee_id <> receiver_employee_id)
);

create index if not exists employee_kudos_company_id_idx
  on public.employee_kudos (company_id);

create index if not exists employee_kudos_sender_employee_id_idx
  on public.employee_kudos (sender_employee_id);

create index if not exists employee_kudos_receiver_employee_id_idx
  on public.employee_kudos (receiver_employee_id);

create index if not exists employee_kudos_company_created_at_idx
  on public.employee_kudos (company_id, created_at);

create index if not exists employee_kudos_sender_month_utc_idx
  on public.employee_kudos (
    company_id,
    sender_employee_id,
    month_bucket_utc
  );

create unique index if not exists employee_kudos_sender_receiver_month_utc_uniq
  on public.employee_kudos (
    company_id,
    sender_employee_id,
    receiver_employee_id,
    month_bucket_utc
  );

alter table public.employee_kudos enable row level security;
alter table public.employee_kudos force row level security;

create or replace function public.validate_employee_kudos_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_sender_company_id uuid;
  v_receiver_company_id uuid;
begin
  select e.company_id
    into v_sender_company_id
    from public.employees e
   where e.id = new.sender_employee_id
     and e.is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_sender_company_id);

  select e.company_id
    into v_receiver_company_id
    from public.employees e
   where e.id = new.receiver_employee_id
     and e.is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_receiver_company_id);

  return new;
end;
$$;

create or replace function public.validate_employee_kudos_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor_employee_id uuid;
  v_actor_profile_id uuid;
  v_month_start_utc timestamptz;
  v_next_month_start_utc timestamptz;
  v_month_count integer;
begin
  v_actor_employee_id := public.current_user_employee_id();

  if v_actor_employee_id is null then
    raise exception 'Authenticated employee context required for kudos';
  end if;

  if new.sender_employee_id is distinct from v_actor_employee_id then
    raise exception 'sender_employee_id must match current user employee';
  end if;

  if new.sender_employee_id = new.receiver_employee_id then
    raise exception 'Self-kudos is not allowed';
  end if;

  if new.points is null or new.points < 1 or new.points > 50 then
    raise exception 'Kudos points must be between 1 and 50';
  end if;

  if new.created_at is null then
    new.created_at := now();
  end if;

  new.month_bucket_utc := date_trunc('month', new.created_at at time zone 'UTC')::date;

  v_month_start_utc := (new.month_bucket_utc::timestamp at time zone 'UTC');
  v_next_month_start_utc := (v_month_start_utc + interval '1 month');

  select count(*)::integer
    into v_month_count
    from public.employee_kudos k
  where k.company_id = new.company_id
    and k.sender_employee_id = new.sender_employee_id
    and k.month_bucket_utc = new.month_bucket_utc;

  if v_month_count >= 5 then
    raise exception 'Monthly kudos limit reached (max 5 per sender per UTC calendar month)';
  end if;

  select up.id
    into v_actor_profile_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if new.created_by is null then
    new.created_by := v_actor_profile_id;
  elsif v_actor_profile_id is not null and new.created_by <> v_actor_profile_id then
    raise exception 'created_by must match current user profile';
  end if;

  return new;
end;
$$;

create or replace function public.block_update_employee_kudos()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Updating employee kudos is not allowed';
end;
$$;

create or replace function public.block_delete_employee_kudos()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Deleting employee kudos is not allowed';
end;
$$;

drop trigger if exists trg_employee_kudos_company_guard on public.employee_kudos;
create trigger trg_employee_kudos_company_guard
  before insert on public.employee_kudos
  for each row execute function public.validate_employee_kudos_company();

drop trigger if exists trg_employee_kudos_insert_guard on public.employee_kudos;
create trigger trg_employee_kudos_insert_guard
  before insert on public.employee_kudos
  for each row execute function public.validate_employee_kudos_insert();

drop trigger if exists trg_employee_kudos_block_update on public.employee_kudos;
create trigger trg_employee_kudos_block_update
  before update on public.employee_kudos
  for each row execute function public.block_update_employee_kudos();

drop trigger if exists trg_employee_kudos_block_delete on public.employee_kudos;
create trigger trg_employee_kudos_block_delete
  before delete on public.employee_kudos
  for each row execute function public.block_delete_employee_kudos();

drop policy if exists employee_kudos_select on public.employee_kudos;
drop policy if exists employee_kudos_insert on public.employee_kudos;
drop policy if exists employee_kudos_update on public.employee_kudos;
drop policy if exists employee_kudos_delete on public.employee_kudos;

create policy employee_kudos_select on public.employee_kudos
  for select
  using (
    company_id = public.current_user_company_id()
    and (
      sender_employee_id = public.current_user_employee_id()
      or receiver_employee_id = public.current_user_employee_id()
      or public.current_user_is_manager_of(sender_employee_id)
      or public.current_user_is_manager_of(receiver_employee_id)
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_kudos_insert on public.employee_kudos
  for insert
  with check (
    company_id = public.current_user_company_id()
    and sender_employee_id = public.current_user_employee_id()
  );

create or replace view public.v_employee_kudos_monthly_leaderboard as
select
  x.company_id,
  x.month_bucket_utc,
  x.receiver_employee_id,
  x.total_points,
  x.kudos_count,
  row_number() over (
    partition by x.company_id, x.month_bucket_utc
    order by x.total_points desc, x.kudos_count desc, x.receiver_employee_id
  ) as company_rank
from (
  select
    k.company_id,
    k.month_bucket_utc,
    k.receiver_employee_id,
    sum(k.points)::integer as total_points,
    count(*)::integer as kudos_count
  from public.employee_kudos k
  where k.company_id = public.current_user_company_id()
  group by
    k.company_id,
    k.month_bucket_utc,
    k.receiver_employee_id
) x;

create or replace view public.v_department_kudos_monthly_leaderboard as
select
  x.company_id,
  x.month_bucket_utc,
  x.department_id,
  x.total_points,
  x.kudos_count,
  row_number() over (
    partition by x.company_id, x.month_bucket_utc
    order by x.total_points desc, x.kudos_count desc, x.department_id nulls last
  ) as department_rank
from (
  select
    k.company_id,
    k.month_bucket_utc,
    e.department_id,
    sum(k.points)::integer as total_points,
    count(*)::integer as kudos_count
  from public.employee_kudos k
  join public.employees e
    on e.id = k.receiver_employee_id
   and e.company_id = k.company_id
   and e.is_deleted = false
  where k.company_id = public.current_user_company_id()
  group by
    k.company_id,
    k.month_bucket_utc,
    e.department_id
) x;

create or replace view public.v_company_kudos_monthly_leaderboard as
select
  k.company_id,
  k.month_bucket_utc,
  count(*)::integer as kudos_count,
  sum(k.points)::integer as total_points,
  count(distinct k.sender_employee_id)::integer as active_senders_count,
  count(distinct k.receiver_employee_id)::integer as active_receivers_count
from public.employee_kudos k
where k.company_id = public.current_user_company_id()
group by
  k.company_id,
  k.month_bucket_utc;
