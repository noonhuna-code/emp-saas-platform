-- Attendance + shift swap DML grants for authenticated role.
-- RLS remains FORCE-enabled and continues enforcing tenant/capability checks.

grant select, insert, update on table public.attendance_records to authenticated;
grant select on table public.attendance_geo_events to authenticated;
grant insert on table public.attendance_geo_events to authenticated;
grant select, insert, update on table public.shift_change_requests to authenticated;
