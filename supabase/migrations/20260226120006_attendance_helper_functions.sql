create or replace function public.set_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if (auth.uid() is not null) then
    new.updated_by = (
      select up.id
      from public.user_profiles up
      where up.user_id = auth.uid()
        and up.is_deleted = false
      limit 1
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_shift_templates_updated_at on public.shift_templates;
create trigger trg_shift_templates_updated_at
before update on public.shift_templates
for each row execute function public.set_attendance_updated_at();

drop trigger if exists trg_employee_shift_assignments_updated_at on public.employee_shift_assignments;
create trigger trg_employee_shift_assignments_updated_at
before update on public.employee_shift_assignments
for each row execute function public.set_attendance_updated_at();

drop trigger if exists trg_attendance_records_updated_at on public.attendance_records;
create trigger trg_attendance_records_updated_at
before update on public.attendance_records
for each row execute function public.set_attendance_updated_at();

drop trigger if exists trg_shift_change_requests_updated_at on public.shift_change_requests;
create trigger trg_shift_change_requests_updated_at
before update on public.shift_change_requests
for each row execute function public.set_attendance_updated_at();

drop trigger if exists trg_attendance_escalations_updated_at on public.attendance_escalations;
create trigger trg_attendance_escalations_updated_at
before update on public.attendance_escalations
for each row execute function public.set_attendance_updated_at();

drop trigger if exists trg_attendance_audit_events_updated_at on public.attendance_audit_events;
create trigger trg_attendance_audit_events_updated_at
before update on public.attendance_audit_events
for each row execute function public.set_attendance_updated_at();

drop trigger if exists trg_company_holidays_updated_at on public.company_holidays;
create trigger trg_company_holidays_updated_at
before update on public.company_holidays
for each row execute function public.set_attendance_updated_at();

create or replace function public.current_user_employee_id()
returns uuid
language sql
security invoker
stable
as $$
  select e.id
  from public.employees e
  join public.user_profiles up on up.id = e.user_profile_id
  where up.user_id = auth.uid()
    and up.is_deleted = false
    and e.is_deleted = false
  limit 1
$$;

create or replace function public.current_user_scope_employee_ids()
returns setof uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select set_config('row_security','off', true);
  with actor_profile as (
    select up.id as user_profile_id
    from public.user_profiles up
    where up.user_id = auth.uid()
      and up.is_deleted = false
    limit 1
  ),
  actor_employee as (
    select e.id as employee_id, e.department_id, e.team_id, e.manager_id
    from public.employees e
    join actor_profile ap on ap.user_profile_id = e.user_profile_id
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
  ),
  self_scope as (
    select employee_id from actor_employee
  ),
  team_scope as (
    select e.id
    from public.employees e
    join public.teams t on t.id = e.team_id
    join actor_profile ap on ap.user_profile_id = t.team_lead_id
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
  ),
  manager_scope as (
    select e.id
    from public.employees e
    join actor_employee ae on ae.employee_id = e.manager_id
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
  ),
  department_scope as (
    select e.id
    from public.employees e
    join actor_employee ae on ae.department_id = e.department_id
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
  ),
  company_scope as (
    select e.id
    from public.employees e
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
      and (
        public.current_user_has_permission('manage_attendance')
        or public.current_user_has_permission('override_attendance')
        or public.current_user_has_permission('approve_attendance')
        or public.current_user_has_permission('manage_escalations')
        or public.current_user_has_permission('assign_shifts')
        or public.current_user_has_permission('manage_shifts')
        or public.current_user_has_permission('view_attendance')
      )
  )
  select distinct employee_id from (
    select employee_id from self_scope
    union all
    select id from team_scope
    union all
    select id from manager_scope
    union all
    select id from department_scope
    union all
    select id from company_scope
  ) s;
$$;

create or replace function public.get_effective_shift_for_employee(p_employee_id uuid, p_date date)
returns table (
  shift_template_id uuid,
  start_time time,
  end_time time,
  timezone text,
  grace_minutes integer,
  auto_absent_after_minutes integer,
  min_half_day_minutes integer,
  min_full_day_minutes integer,
  is_night_shift boolean
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select set_config('row_security','off', true);
  select st.id, st.start_time, st.end_time, st.timezone, st.grace_minutes, st.auto_absent_after_minutes,
         st.min_half_day_minutes, st.min_full_day_minutes, st.is_night_shift
  from public.employee_shift_assignments esa
  join public.shift_templates st on st.id = esa.shift_template_id
  join public.employees e on e.id = esa.employee_id
  where esa.employee_id = p_employee_id
    and e.company_id = public.current_user_company_id()
    and esa.company_id = public.current_user_company_id()
    and st.company_id = public.current_user_company_id()
    and esa.is_deleted = false
    and st.is_deleted = false
    and p_date >= esa.effective_from
    and (esa.effective_to is null or p_date <= esa.effective_to)
  order by esa.effective_from desc
  limit 1;
$$;

create or replace function public.calculate_attendance_status(p_attendance_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rec public.attendance_records%rowtype;
  v_shift_start timestamptz;
  v_shift_end timestamptz;
  v_check_in timestamptz;
  v_check_out timestamptz;
  v_work_minutes integer;
  v_late_minutes integer;
  v_status text;
  v_actor_profile_id uuid;
begin
  perform set_config('row_security','off', true);

  select up.id into v_actor_profile_id
  from public.user_profiles up
  where up.user_id = auth.uid()
    and up.is_deleted = false
  limit 1;

  select * into v_rec
  from public.attendance_records
  where id = p_attendance_id
    and company_id = public.current_user_company_id()
    and is_deleted = false
  for update;

  if not found then
    raise exception 'Attendance record not found or inaccessible';
  end if;

  if v_rec.attendance_locked then
    return v_rec.status;
  end if;

  v_shift_start := (v_rec.attendance_date::text || ' ' || v_rec.shift_start_time::text)::timestamptz at time zone v_rec.shift_timezone;
  v_shift_end := (v_rec.attendance_date::text || ' ' || v_rec.shift_end_time::text)::timestamptz at time zone v_rec.shift_timezone;

  if v_rec.is_night_shift or v_shift_end <= v_shift_start then
    v_shift_end := v_shift_end + interval '1 day';
  end if;

  v_check_in := v_rec.check_in;
  v_check_out := v_rec.check_out;

  if v_check_in is null then
    v_status := v_rec.status;
    update public.attendance_records
      set status = v_status,
          updated_by = v_actor_profile_id
    where id = p_attendance_id;
    return v_status;
  end if;

  v_late_minutes := greatest(0, floor(extract(epoch from (v_check_in - (v_shift_start + (v_rec.grace_minutes || ' minutes')::interval))) / 60));

  if v_check_out is not null then
    v_work_minutes := greatest(0, floor(extract(epoch from (v_check_out - v_check_in)) / 60));
  else
    v_work_minutes := null;
  end if;

  if v_work_minutes is null then
    v_status := case when v_late_minutes > 0 then 'late' else 'present' end;
  elsif v_work_minutes >= v_rec.min_full_day_minutes then
    v_status := case when v_late_minutes > 0 then 'late' else 'present' end;
  elsif v_work_minutes >= v_rec.min_half_day_minutes then
    v_status := 'half_day';
  else
    v_status := 'absent';
  end if;

  update public.attendance_records
    set status = v_status,
        late_minutes = v_late_minutes,
        work_minutes = v_work_minutes,
        updated_by = v_actor_profile_id
  where id = p_attendance_id;

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
  values (
    v_rec.company_id,
    v_rec.id,
    'calculate_status',
    v_rec.status,
    v_status,
    null,
    v_actor_profile_id,
    v_actor_profile_id,
    v_actor_profile_id,
    false
  );

  return v_status;
end;
$$;

create or replace function public.validate_no_shift_overlap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_conflict_exists boolean;
begin
  perform set_config('row_security','off', true);

  select exists (
    select 1
    from public.employee_shift_assignments esa
    where esa.company_id = new.company_id
      and esa.employee_id = new.employee_id
      and esa.is_deleted = false
      and esa.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and daterange(
            esa.effective_from,
            coalesce((esa.effective_to + 1), 'infinity'::date),
            '[)'
          )
          && daterange(
            new.effective_from,
            coalesce((new.effective_to + 1), 'infinity'::date),
            '[)'
          )
  ) into v_conflict_exists;

  if v_conflict_exists then
    raise exception 'Shift assignment overlaps with an existing assignment';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_employee_shift_assignments_no_overlap on public.employee_shift_assignments;
create trigger trg_employee_shift_assignments_no_overlap
before insert or update on public.employee_shift_assignments
for each row execute function public.validate_no_shift_overlap();
