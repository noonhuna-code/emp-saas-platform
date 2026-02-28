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

-- select cron.schedule(
--   'emp_auto_mark_absent_every_10m',
--   '*/10 * * * *',
--   $$select public.auto_mark_absent();$$
-- );
