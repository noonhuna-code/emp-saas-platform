-- ============================================
-- Migration: 67_manage_projects_permission.sql
-- Purpose: Seed manage_projects permission key
-- Scope: Data-only insert
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

insert into public.permissions (key, description)
values ('manage_projects', 'Manage projects and project tasks')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
  from public.roles r
  join public.permissions p on p.key = 'manage_projects'
 where r.is_system_role = true
   and r.name in ('Founder', 'Admin')
on conflict do nothing;
