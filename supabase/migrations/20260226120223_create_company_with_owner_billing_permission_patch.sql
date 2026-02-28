-- ============================================
-- Migration: 20260226120223_create_company_with_owner_billing_permission_patch.sql
-- Purpose : Keep approve_billing_payments out of automatic Founder grants
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.create_company_with_owner(company_name text, slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_owner_id uuid;
  v_founder_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_owner_id := auth.uid();

  insert into public.companies (name, slug, is_active, created_by, updated_by, is_deleted)
  values (company_name, slug, true, v_owner_id, v_owner_id, false)
  returning id into v_company_id;

  select id into v_founder_role_id
  from public.roles
  where is_system_role = true
    and name = 'Founder'
    and is_deleted = false
  limit 1;

  if v_founder_role_id is null then
    insert into public.roles (company_id, name, is_system_role, created_by, updated_by, is_deleted)
    values (null, 'Founder', true, v_owner_id, v_owner_id, false)
    returning id into v_founder_role_id;
  end if;

  insert into public.role_permissions (role_id, permission_id)
  select v_founder_role_id, p.id
  from public.permissions p
  where p.key <> 'approve_billing_payments'
  on conflict do nothing;

  insert into public.user_profiles (user_id, company_id, full_name, is_active, created_by, updated_by, is_deleted)
  values (v_owner_id, v_company_id, coalesce((auth.jwt() ->> 'full_name'), 'Owner'), true, v_owner_id, v_owner_id, false)
  on conflict (user_id) do update
    set company_id = excluded.company_id,
        full_name = excluded.full_name,
        updated_by = v_owner_id,
        is_deleted = false;

  insert into public.user_roles (user_id, role_id, company_id, created_by)
  values (v_owner_id, v_founder_role_id, v_company_id, v_owner_id)
  on conflict do nothing;

  return v_company_id;
end;
$$;
