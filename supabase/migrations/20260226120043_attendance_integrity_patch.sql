-- ============================================
-- Migration: 44_attendance_integrity_patch.sql
-- Purpose: Attendance stability hardening (safe recalculation, lock guards, manager approval guard, nightly reconciliation support)
-- Scope: Attendance functions, triggers, indexes only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None (preserves existing policies)
-- Financial Impact: None
-- ============================================

create index if not exists attendance_records_company_date_lock_idx
  on public.attendance_records (company_id, attendance_date, attendance_locked)
  where is_deleted = false;

create or replace function public.calculate_attendance_status(p_attendance_id uuid)
returns void
language plpgsql
security definer
set search_path = public
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
begin
  perform set_config('row_security','off', true);

  select *
    into v_rec
    from public.attendance_records
   where id = p_attendance_id
     and is_deleted = false
   for update;

  if not found then
    return;
  end if;

  if coalesce(v_rec.attendance_locked, false) then
    return;
  end if;

  select up.id
    into v_actor
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  v_shift_end_date := v_rec.attendance_date;
  if coalesce(v_rec.is_night_shift, false) or v_rec.shift_end_time < v_rec.shift_start_time then
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
        extract(epoch from (v_rec.check_in - (v_shift_start + make_interval(mins => coalesce(v_rec.grace_minutes, 0))))) / 60
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
         early_logout = (v_rec.check_out is not null and v_rec.check_out < v_shift_end),
         missing_logout = (v_rec.check_in is not null and v_rec.check_out is null),
         status = v_new_status,
         updated_at = now(),
         updated_by = v_actor
   where id = v_rec.id
     and is_deleted = false;

  if v_old_status is distinct from v_new_status then
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
    ) values (
      v_rec.company_id,
      v_rec.id,
      'status_change',
      v_old_status,
      v_new_status,
      'recalculate_attendance_status',
      v_actor,
      v_actor,
      v_actor,
      false
    );
  end if;
end;
$$;

create or replace function public.validate_attendance_record_lock_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(old.attendance_locked, false) then
    if ((to_jsonb(new) - 'updated_at') - 'updated_by') is distinct from ((to_jsonb(old) - 'updated_at') - 'updated_by') then
      raise exception 'Attendance record is locked and cannot be modified';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_attendance_break_lock_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_attendance_id uuid;
  v_locked boolean;
begin
  if tg_op = 'DELETE' then
    v_attendance_id := old.attendance_id;
  else
    v_attendance_id := new.attendance_id;
  end if;

  select ar.attendance_locked
    into v_locked
    from public.attendance_records ar
   where ar.id = v_attendance_id
     and ar.is_deleted = false;

  if coalesce(v_locked, false) then
    raise exception 'Attendance record is locked; break entries cannot be modified';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.validate_attendance_manager_approval_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
  v_can_manage boolean;
  v_can_override boolean;
  v_can_approve boolean;
  v_is_manager boolean;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.approval_status is not distinct from old.approval_status
     and new.approved_by is not distinct from old.approved_by
     and new.approved_at is not distinct from old.approved_at then
    return new;
  end if;

  if new.approval_status is null then
    return new;
  end if;

  select up.id
    into v_actor_profile_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if auth.uid() is null then
    raise exception 'Authenticated user required for attendance approval changes';
  end if;

  v_can_manage := public.current_user_has_permission('manage_attendance');
  v_can_override := public.current_user_has_permission('override_attendance');
  v_can_approve := public.current_user_has_permission('approve_attendance');
  v_is_manager := public.current_user_is_manager_of(new.employee_id);

  if not (
    v_can_manage
    or v_can_override
    or (v_can_approve and v_is_manager)
  ) then
    raise exception 'Attendance approval update requires manager or attendance override authorization';
  end if;

  if new.approval_status in ('approved','rejected') then
    if new.approved_by is null then
      new.approved_by := v_actor_profile_id;
    end if;
    if new.approved_at is null then
      new.approved_at := now();
    end if;
  elsif new.approval_status = 'pending' then
    if not (v_can_manage or v_can_override) then
      raise exception 'Only attendance managers/override users can reset approval status to pending';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.run_nightly_attendance_reconciliation(p_target_date date default (current_date - 1))
returns table (company_id uuid, reconciled_records integer, locked_records integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_reconciled integer;
  v_locked integer;
  v_row record;
begin
  perform set_config('row_security','off', true);

  perform public.auto_mark_absent();

  for v_company_id in
    select distinct ar.company_id
      from public.attendance_records ar
     where ar.attendance_date = p_target_date
       and ar.is_deleted = false
  loop
    v_reconciled := 0;
    v_locked := 0;

    for v_row in
      select ar.id
        from public.attendance_records ar
       where ar.company_id = v_company_id
         and ar.attendance_date = p_target_date
         and ar.is_deleted = false
         and ar.attendance_locked = false
    loop
      perform public.calculate_attendance_status(v_row.id);
      v_reconciled := v_reconciled + 1;
    end loop;

    with updated as (
      update public.attendance_records ar
         set attendance_locked = true,
             updated_at = now()
       where ar.company_id = v_company_id
         and ar.attendance_date = p_target_date
         and ar.is_deleted = false
         and ar.attendance_locked = false
         and (
           ar.status <> 'pending'
           or ar.check_in is not null
           or ar.check_out is not null
           or ar.auto_marked = true
         )
      returning 1
    )
    select count(*) into v_locked from updated;

    company_id := v_company_id;
    reconciled_records := coalesce(v_reconciled, 0);
    locked_records := coalesce(v_locked, 0);
    return next;
  end loop;

  return;
end;
$$;

drop trigger if exists trg_attendance_records_lock_guard on public.attendance_records;
create trigger trg_attendance_records_lock_guard
  before update on public.attendance_records
  for each row execute function public.validate_attendance_record_lock_guard();

drop trigger if exists trg_attendance_records_manager_approval_guard on public.attendance_records;
create trigger trg_attendance_records_manager_approval_guard
  before update on public.attendance_records
  for each row execute function public.validate_attendance_manager_approval_guard();

drop trigger if exists trg_attendance_breaks_lock_guard on public.attendance_breaks;
create trigger trg_attendance_breaks_lock_guard
  before insert or update or delete on public.attendance_breaks
  for each row execute function public.validate_attendance_break_lock_guard();

-- Cron support example (Supabase pg_cron):
-- select cron.schedule(
--   'attendance_nightly_reconciliation',
--   '59 23 * * *',
--   $$select public.run_nightly_attendance_reconciliation();$$
-- );