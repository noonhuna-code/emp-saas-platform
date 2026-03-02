-- Grant minimal authenticated role privileges required by login/session flows.
-- RLS remains the primary data boundary.
-- Non-destructive, replay-safe.

grant usage on schema public to authenticated;

grant select on table public.user_profiles to authenticated;
grant select on table public.user_roles to authenticated;
grant select on table public.roles to authenticated;
grant select on table public.role_permissions to authenticated;
grant select on table public.permissions to authenticated;
grant select on table public.companies to authenticated;

grant select, insert, update on table public.auth_sessions to authenticated;

grant select on table public.employees to authenticated;
grant select on table public.attendance_records to authenticated;
grant select on table public.employee_shift_assignments to authenticated;
grant select on table public.shift_templates to authenticated;
