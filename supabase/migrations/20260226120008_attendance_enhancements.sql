-- EMP/supabase/attendance_enhancements.sql
create table if not exists public.attendance_breaks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  attendance_id uuid not null references public.attendance_records(id) on delete restrict,
  break_start timestamptz not null,
  break_end timestamptz,
  break_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.attendance_breaks
  add constraint attendance_breaks_time_chk
  check (break_end is null or break_end >= break_start);

create index if not exists attendance_breaks_company_id_idx
  on public.attendance_breaks (company_id)
  where is_deleted = false;

create index if not exists attendance_breaks_attendance_id_idx
  on public.attendance_breaks (attendance_id)
  where is_deleted = false;

create table if not exists public.attendance_correction_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  attendance_id uuid not null references public.attendance_records(id) on delete restrict,
  requested_check_in timestamptz,
  requested_check_out timestamptz,
  reason text not null,
  status text not null default 'pending',
  reviewed_by uuid references public.user_profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.attendance_correction_requests
  add constraint attendance_correction_requests_status_chk
  check (status in ('pending','approved','rejected'));

create index if not exists attendance_correction_requests_company_id_idx
  on public.attendance_correction_requests (company_id)
  where is_deleted = false;

create index if not exists attendance_correction_requests_attendance_id_idx
  on public.attendance_correction_requests (attendance_id)
  where is_deleted = false;

alter table public.attendance_records
  add column if not exists overtime_minutes integer not null default 0;

alter table public.attendance_records
  add column if not exists early_logout boolean not null default false;

alter table public.attendance_records
  add column if not exists missing_logout boolean not null default false;

drop function if exists public.calculate_attendance_status(uuid);
create or replace function public.calculate_attendance_status(p_attendance_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rec record;
  v_shift_start timestamptz;
  v_shift_end timestamptz;
  v_shift_end_date date;
  v_late_minutes integer;
  v_work_minutes integer;
  v_break_minutes integer;
  v_overtime_minutes integer;
  v_shift_duration_minutes integer;
  v_new_status text;
  v_old_status text;
  v_actor uuid;
  v_missing_logout boolean;
  v_early_logout boolean;
begin
  perform set_config('row_security','off', true);

  select *
    into v_rec
    from public.attendance_records
   where id = p_attendance_id
     and is_deleted = false;

  if not found then
    return;
  end if;

  v_actor := (
    select id
      from public.user_profiles
     where user_id = auth.uid()
  );

  v_shift_end_date := v_rec.attendance_date;
  if v_rec.is_night_shift or v_rec.shift_end_time < v_rec.shift_start_time then
    v_shift_end_date := v_rec.attendance_date + 1;
  end if;

  v_shift_start := (v_rec.attendance_date::timestamp + v_rec.shift_start_time) at time zone v_rec.shift_timezone;
  v_shift_end := (v_shift_end_date::timestamp + v_rec.shift_end_time) at time zone v_rec.shift_timezone;

  v_shift_duration_minutes := greatest(
    0,
    floor(extract(epoch from (v_shift_end - v_shift_start)) / 60)::int
  );

  if v_rec.check_in is null then
    v_late_minutes := null;
  else
    v_late_minutes := greatest(
      0,
      floor(
        extract(epoch from (v_rec.check_in - (v_shift_start + make_interval(mins => v_rec.grace_minutes)))) / 60
      )::int
    );
  end if;

  select coalesce(sum(
    case
      when b.break_minutes is not null then b.break_minutes
      when b.break_end is not null then greatest(0, floor(extract(epoch from (b.break_end - b.break_start)) / 60)::int)
      else 0
    end
  ), 0)
    into v_break_minutes
    from public.attendance_breaks b
   where b.attendance_id = v_rec.id
     and b.is_deleted = false;

  if v_rec.check_in is not null and v_rec.check_out is not null then
    v_work_minutes := greatest(
      0,
      floor(extract(epoch from (v_rec.check_out - v_rec.check_in)) / 60)::int - coalesce(v_break_minutes, 0)
    );
  else
    v_work_minutes := null;
  end if;

  v_missing_logout := (v_rec.check_in is not null and v_rec.check_out is null);
  v_early_logout := (v_rec.check_out is not null and v_rec.check_out < v_shift_end);

  if v_work_minutes is null then
    v_overtime_minutes := 0;
  else
    v_overtime_minutes := greatest(0, v_work_minutes - v_shift_duration_minutes);
  end if;

  v_old_status := v_rec.status;

  if v_rec.check_in is null and v_rec.check_out is null then
    v_new_status := 'pending';
  elsif v_work_minutes is null then
    v_new_status := 'pending';
  elsif v_work_minutes < v_rec.min_half_day_minutes then
    v_new_status := 'absent';
  elsif v_work_minutes < v_rec.min_full_day_minutes then
    v_new_status := 'half_day';
  else
    if coalesce(v_late_minutes, 0) > 0 then
      v_new_status := 'late';
    else
      v_new_status := 'present';
    end if;
  end if;

  update public.attendance_records
     set late_minutes = v_late_minutes,
         work_minutes = v_work_minutes,
         overtime_minutes = v_overtime_minutes,
         early_logout = v_early_logout,
         missing_logout = v_missing_logout,
         status = v_new_status,
         updated_at = now(),
         updated_by = v_actor
   where id = v_rec.id;

  if v_old_status is distinct from v_new_status then
    insert into public.attendance_audit_events
      (company_id, attendance_id, event_type, event_data, created_at, created_by)
    values
      (
        v_rec.company_id,
        v_rec.id,
        'status_change',
        jsonb_build_object('old_status', v_old_status, 'new_status', v_new_status),
        now(),
        v_actor
      );
  end if;
end;
$$;

alter table public.attendance_breaks enable row level security;
alter table public.attendance_breaks force row level security;

alter table public.attendance_correction_requests enable row level security;
alter table public.attendance_correction_requests force row level security;

drop policy if exists attendance_breaks_select on public.attendance_breaks;
drop policy if exists attendance_breaks_insert on public.attendance_breaks;
drop policy if exists attendance_breaks_update on public.attendance_breaks;

drop policy if exists attendance_correction_requests_select on public.attendance_correction_requests;
drop policy if exists attendance_correction_requests_insert on public.attendance_correction_requests;
drop policy if exists attendance_correction_requests_update on public.attendance_correction_requests;

create policy attendance_breaks_select on public.attendance_breaks
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and attendance_id in (
      select id from public.attendance_records
      where company_id = public.current_user_company_id()
        and is_deleted = false
        and employee_id in (select * from public.current_user_scope_employee_ids())
    )
  );

create policy attendance_breaks_insert on public.attendance_breaks
  for insert
  with check (
    company_id = public.current_user_company_id()
    and attendance_id in (
      select id from public.attendance_records
      where company_id = public.current_user_company_id()
        and is_deleted = false
        and employee_id in (select * from public.current_user_scope_employee_ids())
    )
  );

create policy attendance_breaks_update on public.attendance_breaks
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and attendance_id in (
      select id from public.attendance_records
      where company_id = public.current_user_company_id()
        and is_deleted = false
        and employee_id in (select * from public.current_user_scope_employee_ids())
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and attendance_id in (
      select id from public.attendance_records
      where company_id = public.current_user_company_id()
        and is_deleted = false
        and employee_id in (select * from public.current_user_scope_employee_ids())
    )
  );

create policy attendance_correction_requests_select on public.attendance_correction_requests
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and attendance_id in (
      select id from public.attendance_records
      where company_id = public.current_user_company_id()
        and is_deleted = false
        and employee_id in (select * from public.current_user_scope_employee_ids())
    )
  );

create policy attendance_correction_requests_insert on public.attendance_correction_requests
  for insert
  with check (
    company_id = public.current_user_company_id()
    and attendance_id in (
      select id from public.attendance_records
      where company_id = public.current_user_company_id()
        and is_deleted = false
        and employee_id = public.current_user_employee_id()
    )
  );

create policy attendance_correction_requests_update on public.attendance_correction_requests
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and attendance_id in (
      select id from public.attendance_records
      where company_id = public.current_user_company_id()
        and is_deleted = false
        and employee_id in (select * from public.current_user_scope_employee_ids())
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and attendance_id in (
      select id from public.attendance_records
      where company_id = public.current_user_company_id()
        and is_deleted = false
        and employee_id in (select * from public.current_user_scope_employee_ids())
    )
    and (
      public.current_user_has_permission('manage_attendance')
      or (
        exists (
          select 1 from public.attendance_records ar
          where ar.id = attendance_id
            and ar.employee_id = public.current_user_employee_id()
        )
        and status = 'pending'
        and exists (
          select 1 from public.attendance_correction_requests cr
          where cr.id = id
            and cr.status = 'pending'
            and cr.is_deleted = false
        )
      )
    )
  );

create trigger trg_attendance_breaks_updated_at
  before update on public.attendance_breaks
  for each row execute function public.set_updated_at();

create trigger trg_attendance_correction_requests_updated_at
  before update on public.attendance_correction_requests
  for each row execute function public.set_updated_at();
