insert into public.permissions (key, description, created_at)
values
  ('manage_shifts', 'Manage shift templates and holiday calendar', now()),
  ('assign_shifts', 'Assign shifts to employees', now()),
  ('manage_attendance', 'Create and manage attendance records', now()),
  ('approve_attendance', 'Approve attendance adjustments', now()),
  ('override_attendance', 'Override attendance records', now()),
  ('view_attendance', 'View attendance records', now()),
  ('manage_escalations', 'Manage attendance escalations', now())
on conflict (key) do nothing;
