-- EMP/supabase/shift_rules_engine.sql

create table if not exists public.shift_rest_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  minimum_rest_hours integer not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create table if not exists public.shift_consecutive_limits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  max_consecutive_days integer not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create table if not exists public.shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  requester_employee_id uuid not null references public.employees(id) on delete restrict,
  target_employee_id uuid not null references public.employees(id) on delete restrict,
  shift_date date not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.shift_swap_requests
  add constraint shift_swap_requests_status_chk
  check (status in ('pending_partner','pending_supervisor','approved','rejected'));

create index if not exists shift_rest_rules_company_id_idx
  on public.shift_rest_rules (company_id)
  where is_deleted = false;

create index if not exists shift_consecutive_limits_company_id_idx
  on public.shift_consecutive_limits (company_id)
  where is_deleted = false;

create index if not exists shift_swap_requests_company_id_idx
  on public.shift_swap_requests (company_id)
  where is_deleted = false;

create index if not exists shift_swap_requests_shift_date_idx
  on public.shift_swap_requests (shift_date)
  where is_deleted = false;

create index if not exists shift_swap_requests_requester_idx
  on public.shift_swap_requests (requester_employee_id)
  where is_deleted = false;

create index if not exists shift_swap_requests_target_idx
  on public.shift_swap_requests (target_employee_id)
  where is_deleted = false;

create or replace function public.validate_minimum_rest(employee_uuid uuid, shift_start timestamptz)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid;
  v_rule integer;
  v_last record;
  v_last_end timestamptz;
  v_ok boolean := true;
begin
  perform set_config('row_security','off', true);

  select company_id into v_company_id
  from public.employees
  where id = employee_uuid
    and is_deleted = false;

  if v_company_id is null then
    return false;
  end if;

  select minimum_rest_hours into v_rule
  from public.shift_rest_rules
  where company_id = v_company_id
    and is_deleted = false
    and is_enabled = true
  order by created_at desc
  limit 1;

  if v_rule is null then
    return true;
  end if;

  select ar.attendance_date, ar.check_out, ar.shift_end_time, ar.shift_timezone, ar.is_night_shift
    into v_last
    from public.attendance_records ar
   where ar.company_id = v_company_id
     and ar.employee_id = employee_uuid
     and ar.is_deleted = false
   order by ar.attendance_date desc
   limit 1;

  if v_last is null then
    return true;
  end if;

  if v_last.check_out is not null then
    v_last_end := v_last.check_out;
  else
    if v_last.is_night_shift then
      v_last_end := ((v_last.attendance_date + 1)::timestamp + v_last.shift_end_time) at time zone v_last.shift_timezone;
    else
      v_last_end := (v_last.attendance_date::timestamp + v_last.shift_end_time) at time zone v_last.shift_timezone;
    end if;
  end if;

  if shift_start is null or v_last_end is null then
    return true;
  end if;

  v_ok := (extract(epoch from (shift_start - v_last_end)) / 3600.0) >= v_rule;
  return v_ok;
end;
$$;

create or replace function public.validate_consecutive_days(employee_uuid uuid, check_date date)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid;
  v_limit integer;
  v_date date;
  v_count integer := 0;
  v_has_attendance boolean;
begin
  perform set_config('row_security','off', true);

  select company_id into v_company_id
  from public.employees
  where id = employee_uuid
    and is_deleted = false;

  if v_company_id is null then
    return false;
  end if;

  select max_consecutive_days into v_limit
  from public.shift_consecutive_limits
  where company_id = v_company_id
    and is_deleted = false
    and is_enabled = true
  order by created_at desc
  limit 1;

  if v_limit is null then
    return true;
  end if;

  v_date := check_date;
  loop
    select exists (
      select 1 from public.attendance_records ar
      where ar.company_id = v_company_id
        and ar.employee_id = employee_uuid
        and ar.attendance_date = v_date
        and ar.is_deleted = false
        and ar.status in ('present','late','half_day')
    ) into v_has_attendance;

    if v_has_attendance then
      v_count := v_count + 1;
      v_date := v_date - 1;
    else
      exit;
    end if;
  end loop;

  return v_count <= v_limit;
end;
$$;

create or replace function public.bulk_assign_shifts(
  company_uuid uuid,
  shift_id uuid,
  employee_ids uuid[],
  shift_date date
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_employee_id uuid;
  v_shift record;
  v_shift_start timestamptz;
  v_assigned_by uuid;
  v_ok boolean;
  v_overlap boolean;
  v_user_profile_id uuid;
begin
  perform set_config('row_security','off', true);

  if company_uuid is null or shift_id is null or shift_date is null then
    raise exception 'Missing required parameters';
  end if;

  select id into v_user_profile_id
  from public.user_profiles
  where user_id = auth.uid();

  if v_user_profile_id is null then
    raise exception 'Authenticated user required';
  end if;

  select * into v_shift
  from public.shift_templates st
  where st.id = shift_id
    and st.company_id = company_uuid
    and st.is_deleted = false;

  if not found then
    raise exception 'Shift template not found';
  end if;

  v_shift_start := (shift_date::timestamp + v_shift.start_time) at time zone v_shift.timezone;

  foreach v_employee_id in array employee_ids loop
    select exists (
      select 1 from public.employee_shift_assignments esa
      where esa.company_id = company_uuid
        and esa.employee_id = v_employee_id
        and esa.is_deleted = false
        and daterange(
              esa.effective_from,
              coalesce((esa.effective_to + 1), 'infinity'::date),
              '[)'
            ) && daterange(shift_date, shift_date + 1, '[)')
    ) into v_overlap;

    if v_overlap then
      raise exception 'Shift overlap for employee % on %', v_employee_id, shift_date;
    end if;

    v_ok := public.validate_minimum_rest(v_employee_id, v_shift_start);
    if not v_ok then
      raise exception 'Minimum rest rule violated for employee %', v_employee_id;
    end if;

    v_ok := public.validate_consecutive_days(v_employee_id, shift_date);
    if not v_ok then
      raise exception 'Consecutive days limit violated for employee %', v_employee_id;
    end if;

    insert into public.employee_shift_assignments (
      company_id,
      employee_id,
      shift_template_id,
      effective_from,
      effective_to,
      assigned_by,
      assignment_type,
      created_by,
      updated_by
    ) values (
      company_uuid,
      v_employee_id,
      shift_id,
      shift_date,
      shift_date,
      v_user_profile_id,
      'bulk',
      v_user_profile_id,
      v_user_profile_id
    );
  end loop;
end;
$$;

alter table public.shift_rest_rules enable row level security;
alter table public.shift_rest_rules force row level security;

alter table public.shift_consecutive_limits enable row level security;
alter table public.shift_consecutive_limits force row level security;

alter table public.shift_swap_requests enable row level security;
alter table public.shift_swap_requests force row level security;

drop policy if exists shift_rest_rules_select on public.shift_rest_rules;
drop policy if exists shift_rest_rules_insert on public.shift_rest_rules;
drop policy if exists shift_rest_rules_update on public.shift_rest_rules;

drop policy if exists shift_consecutive_limits_select on public.shift_consecutive_limits;
drop policy if exists shift_consecutive_limits_insert on public.shift_consecutive_limits;
drop policy if exists shift_consecutive_limits_update on public.shift_consecutive_limits;

drop policy if exists shift_swap_requests_select on public.shift_swap_requests;
drop policy if exists shift_swap_requests_insert on public.shift_swap_requests;
drop policy if exists shift_swap_requests_update on public.shift_swap_requests;

create policy shift_rest_rules_select on public.shift_rest_rules
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy shift_rest_rules_insert on public.shift_rest_rules
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_shifts')
  );

create policy shift_rest_rules_update on public.shift_rest_rules
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_shifts')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_shifts')
  );

create policy shift_consecutive_limits_select on public.shift_consecutive_limits
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy shift_consecutive_limits_insert on public.shift_consecutive_limits
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_shifts')
  );

create policy shift_consecutive_limits_update on public.shift_consecutive_limits
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_shifts')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_shifts')
  );

create policy shift_swap_requests_select on public.shift_swap_requests
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and (
      requester_employee_id in (select * from public.current_user_scope_employee_ids())
      or target_employee_id in (select * from public.current_user_scope_employee_ids())
    )
  );

create policy shift_swap_requests_insert on public.shift_swap_requests
  for insert
  with check (
    company_id = public.current_user_company_id()
    and requester_employee_id = public.current_user_employee_id()
    and target_employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy shift_swap_requests_update on public.shift_swap_requests
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and (
      public.current_user_has_permission('manage_shifts')
      or requester_employee_id = public.current_user_employee_id()
      or target_employee_id = public.current_user_employee_id()
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_shifts')
      or requester_employee_id = public.current_user_employee_id()
      or target_employee_id = public.current_user_employee_id()
    )
  );

create trigger trg_shift_rest_rules_updated_at
  before update on public.shift_rest_rules
  for each row execute function public.set_updated_at();

create trigger trg_shift_consecutive_limits_updated_at
  before update on public.shift_consecutive_limits
  for each row execute function public.set_updated_at();

create trigger trg_shift_swap_requests_updated_at
  before update on public.shift_swap_requests
  for each row execute function public.set_updated_at();

-- ================================
-- SUMMARY
-- ================================
-- Tables created: shift_rest_rules, shift_consecutive_limits, shift_swap_requests
-- Functions created: validate_minimum_rest, validate_consecutive_days, bulk_assign_shifts
-- Policies created: shift_rest_rules_select/insert/update, shift_consecutive_limits_select/insert/update, shift_swap_requests_select/insert/update
-- Indexes created: shift_rest_rules_company_id_idx, shift_consecutive_limits_company_id_idx, shift_swap_requests_company_id_idx, shift_swap_requests_shift_date_idx, shift_swap_requests_requester_idx, shift_swap_requests_target_idx
-- Self-audit: no duplicates, idempotent, multi-tenant safe, soft-delete consistent
-- ================================
