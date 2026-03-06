-- Allow self clock-in/clock-out writes for employee users with view_attendance.
-- Non-destructive policy replacement on attendance_records only.

drop policy if exists attendance_records_insert on public.attendance_records;
create policy attendance_records_insert on public.attendance_records
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('manage_attendance')
      or (
        employee_id = public.current_user_employee_id()
        and public.current_user_has_permission('view_attendance')
      )
    )
  );

drop policy if exists attendance_records_update on public.attendance_records;
create policy attendance_records_update on public.attendance_records
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('manage_attendance')
      or public.current_user_has_permission('approve_attendance')
      or public.current_user_has_permission('override_attendance')
      or (
        employee_id = public.current_user_employee_id()
        and public.current_user_has_permission('view_attendance')
      )
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('manage_attendance')
      or public.current_user_has_permission('approve_attendance')
      or public.current_user_has_permission('override_attendance')
      or (
        employee_id = public.current_user_employee_id()
        and public.current_user_has_permission('view_attendance')
        and check_out is not null
      )
    )
  );
