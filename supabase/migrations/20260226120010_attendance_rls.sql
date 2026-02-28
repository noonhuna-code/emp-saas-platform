alter table public.shift_templates enable row level security;
alter table public.shift_templates force row level security;
alter table public.employee_shift_assignments enable row level security;
alter table public.employee_shift_assignments force row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_records force row level security;
alter table public.shift_change_requests enable row level security;
alter table public.shift_change_requests force row level security;
alter table public.attendance_escalations enable row level security;
alter table public.attendance_escalations force row level security;
alter table public.attendance_audit_events enable row level security;
alter table public.attendance_audit_events force row level security;
alter table public.company_holidays enable row level security;
alter table public.company_holidays force row level security;

drop policy if exists shift_templates_select on public.shift_templates;
create policy shift_templates_select on public.shift_templates
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

drop policy if exists shift_templates_insert on public.shift_templates;
create policy shift_templates_insert on public.shift_templates
  for insert
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_shifts'));

drop policy if exists shift_templates_update on public.shift_templates;
create policy shift_templates_update on public.shift_templates
  for update
  using (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_shifts'))
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_shifts'));

drop policy if exists employee_shift_assignments_select on public.employee_shift_assignments;
create policy employee_shift_assignments_select on public.employee_shift_assignments
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

drop policy if exists employee_shift_assignments_insert on public.employee_shift_assignments;
create policy employee_shift_assignments_insert on public.employee_shift_assignments
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('assign_shifts')
  );

drop policy if exists employee_shift_assignments_update on public.employee_shift_assignments;
create policy employee_shift_assignments_update on public.employee_shift_assignments
  for update
  using (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('assign_shifts')
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('assign_shifts')
  );

drop policy if exists attendance_records_select on public.attendance_records;
create policy attendance_records_select on public.attendance_records
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

drop policy if exists attendance_records_insert on public.attendance_records;
create policy attendance_records_insert on public.attendance_records
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('manage_attendance')
  );

drop policy if exists attendance_records_update on public.attendance_records;
create policy attendance_records_update on public.attendance_records
  for update
  using (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('manage_attendance')
      or public.current_user_has_permission('approve_attendance')
      or public.current_user_has_permission('override_attendance')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('manage_attendance')
      or public.current_user_has_permission('approve_attendance')
      or public.current_user_has_permission('override_attendance')
    )
  );

drop policy if exists shift_change_requests_select on public.shift_change_requests;
create policy shift_change_requests_select on public.shift_change_requests
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

drop policy if exists shift_change_requests_insert on public.shift_change_requests;
create policy shift_change_requests_insert on public.shift_change_requests
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('assign_shifts')
      or public.current_user_has_permission('manage_attendance')
    )
  );

drop policy if exists shift_change_requests_update on public.shift_change_requests;
create policy shift_change_requests_update on public.shift_change_requests
  for update
  using (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('assign_shifts')
      or public.current_user_has_permission('manage_attendance')
      or public.current_user_has_permission('approve_attendance')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('assign_shifts')
      or public.current_user_has_permission('manage_attendance')
      or public.current_user_has_permission('approve_attendance')
    )
  );

drop policy if exists attendance_escalations_select on public.attendance_escalations;
create policy attendance_escalations_select on public.attendance_escalations
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and attendance_id in (
      select ar.id
      from public.attendance_records ar
      where ar.company_id = public.current_user_company_id()
        and ar.is_deleted = false
        and ar.employee_id in (select * from public.current_user_scope_employee_ids())
    )
  );

drop policy if exists attendance_escalations_insert on public.attendance_escalations;
create policy attendance_escalations_insert on public.attendance_escalations
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_escalations')
  );

drop policy if exists attendance_escalations_update on public.attendance_escalations;
create policy attendance_escalations_update on public.attendance_escalations
  for update
  using (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_escalations')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_escalations')
  );

drop policy if exists attendance_audit_events_select on public.attendance_audit_events;
create policy attendance_audit_events_select on public.attendance_audit_events
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('view_attendance')
  );

drop policy if exists attendance_audit_events_insert on public.attendance_audit_events;
create policy attendance_audit_events_insert on public.attendance_audit_events
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_attendance')
      or public.current_user_has_permission('override_attendance')
    )
  );

drop policy if exists company_holidays_select on public.company_holidays;
create policy company_holidays_select on public.company_holidays
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

drop policy if exists company_holidays_insert on public.company_holidays;
create policy company_holidays_insert on public.company_holidays
  for insert
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_shifts'));

drop policy if exists company_holidays_update on public.company_holidays;
create policy company_holidays_update on public.company_holidays
  for update
  using (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_shifts'))
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_shifts'));
