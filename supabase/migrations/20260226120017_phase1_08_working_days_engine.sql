-- EMP/supabase/phase1_08_working_days_engine.sql

create table if not exists public.company_working_days (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  day_of_week integer not null check (day_of_week between 0 and 6),
  is_working_day boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create unique index if not exists company_working_days_company_day_uniq
  on public.company_working_days(company_id, day_of_week)
  where is_deleted = false;

create index if not exists company_working_days_company_id_idx
  on public.company_working_days(company_id)
  where is_deleted = false;

alter table public.company_working_days enable row level security;
alter table public.company_working_days force row level security;

drop policy if exists company_working_days_select on public.company_working_days;
drop policy if exists company_working_days_insert on public.company_working_days;
drop policy if exists company_working_days_update on public.company_working_days;

create policy company_working_days_select on public.company_working_days
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy company_working_days_insert on public.company_working_days
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_company')
  );

create policy company_working_days_update on public.company_working_days
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_company')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_company')
  );

create trigger trg_company_working_days_updated_at
  before update on public.company_working_days
  for each row execute function public.set_updated_at();

create or replace function public.is_company_working_day(p_company_id uuid, p_date date)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_dow integer;
  v_is_working boolean;
  v_has_config boolean;
begin
  v_dow := extract(dow from p_date)::int;

  select true
    into v_has_config
    from public.company_working_days
   where company_id = p_company_id
     and is_deleted = false
   limit 1;

  if v_has_config is distinct from true then
    return true;
  end if;

  select is_working_day
    into v_is_working
    from public.company_working_days
   where company_id = p_company_id
     and day_of_week = v_dow
     and is_deleted = false
   limit 1;

  return coalesce(v_is_working, false);
end;
$$;

create or replace function public.auto_mark_absent()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_updated_count integer := 0;
begin
  perform set_config('row_security','off', true);

  with due as (
    select ar.id, ar.company_id, ar.employee_id,
           (ar.attendance_date::text || ' ' || ar.shift_start_time::text)::timestamptz at time zone ar.shift_timezone as shift_start_ts,
           ar.auto_absent_after_minutes
      from public.attendance_records ar
     where ar.status = 'pending'
       and ar.check_in is null
       and ar.is_deleted = false
       and ar.attendance_locked = false
       and public.is_company_working_day(ar.company_id, ar.attendance_date) = true
  ),
  updated as (
    update public.attendance_records ar
       set status = 'absent',
           auto_marked = true,
           late_minutes = 0,
           work_minutes = 0,
           updated_by = null
      from due
     where ar.id = due.id
       and v_now > (due.shift_start_ts + (due.auto_absent_after_minutes || ' minutes')::interval)
    returning ar.id, ar.company_id, ar.employee_id, ar.shift_template_id, ar.attendance_date
  )
  select count(*) into v_updated_count from updated;

  insert into public.attendance_escalations (
    company_id,
    attendance_id,
    escalated_to,
    escalation_level,
    created_by,
    updated_by,
    is_deleted
  )
  select u.company_id,
         u.id,
         coalesce(
           (select e.manager_id from public.employees e where e.id = u.employee_id and e.is_deleted = false),
           (select e2.id
              from public.employees e2
             where e2.company_id = u.company_id
               and e2.department_id = (select e3.department_id from public.employees e3 where e3.id = u.employee_id)
               and e2.manager_id is null
               and e2.is_deleted = false
             limit 1),
           u.employee_id
         ) as escalated_to,
         1,
         null,
         null,
         false
    from public.attendance_records u
   where u.status = 'absent'
     and u.auto_marked = true
     and u.is_deleted = false
     and not exists (
       select 1
         from public.attendance_escalations ae
        where ae.attendance_id = u.id
          and ae.is_deleted = false
          and ae.resolved = false
     );

  insert into public.attendance_audit_events (
    company_id,
    attendance_id,
    action,
    old_status,
    new_status,
    reason,
    changed_by,
    created_by,
    updated_by,
    is_deleted
  )
  select ar.company_id,
         ar.id,
         'auto_mark_absent',
         'pending',
         'absent',
         'auto_mark_absent',
         null,
         null,
         null,
         false
    from public.attendance_records ar
   where ar.status = 'absent'
     and ar.auto_marked = true
     and ar.is_deleted = false
     and not exists (
       select 1
         from public.attendance_audit_events ae
        where ae.attendance_id = ar.id
          and ae.action = 'auto_mark_absent'
          and ae.is_deleted = false
     );

  return v_updated_count;
end;
$$;

-- ============================================
-- PHASE 1 MODULE SUMMARY
-- Tables created: company_working_days
-- Columns added: none
-- Constraints added: company_working_days_company_day_uniq
-- Functions created: is_company_working_day (auto_mark_absent updated)
-- Indexes added: company_working_days_company_id_idx
-- RLS policies added: company_working_days_select/insert/update
-- ============================================
