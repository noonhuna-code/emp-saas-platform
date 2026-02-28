-- ============================================
-- Migration: 20260226120245_platform_owner_global_dashboard_access.sql
-- Purpose : Platform-owner global read permissions + dashboard-safe RLS widening
-- Scope   : Additive, non-destructive, replay-safe
-- ============================================

insert into public.permissions (key, description)
values
  ('view_all_companies', 'View platform-wide company summaries across tenants'),
  ('manage_plan_versions', 'Manage billing plan version lifecycle'),
  ('manage_pricing', 'Manage pricing version records'),
  ('override_subscription', 'Perform controlled subscription override operations'),
  ('view_global_audit', 'View platform-wide immutable governance and billing audit events'),
  ('impersonate_company', 'Impersonate a company context for support workflows')
on conflict (key) do nothing;

insert into public.roles (company_id, name, is_system_role, created_at, updated_at, is_deleted)
select null, 'Platform Owner', true, now(), now(), false
where not exists (
  select 1
  from public.roles
  where is_system_role = true
    and is_deleted = false
    and lower(name) = 'platform owner'
);

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.key in (
    'approve_billing_payments',
    'manage_pricing',
    'view_all_companies',
    'override_subscription',
    'manage_plan_versions',
    'view_global_audit',
    'impersonate_company'
  )
where r.is_system_role = true
  and r.name = 'Platform Owner'
on conflict do nothing;

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select
  using (
    is_deleted = false
    and (
      id = public.current_user_company_id()
      or public.current_user_has_permission('view_all_companies')
    )
  );

drop policy if exists company_subscriptions_select on public.company_subscriptions;
create policy company_subscriptions_select on public.company_subscriptions
  for select
  using (
    (
      company_id = public.current_user_company_id()
      and (
        public.current_user_has_permission('view_billing')
        or public.current_user_has_permission('manage_billing')
        or public.current_user_has_permission('manage_company')
      )
    )
    or public.current_user_has_permission('view_all_companies')
  );

drop policy if exists company_seat_assignments_select on public.company_seat_assignments;
create policy company_seat_assignments_select on public.company_seat_assignments
  for select
  using (
    (
      company_id = public.current_user_company_id()
      and (
        public.current_user_has_permission('view_billing')
        or public.current_user_has_permission('manage_billing')
        or public.current_user_has_permission('manage_company')
        or public.current_user_has_permission('manage_employees')
      )
    )
    or public.current_user_has_permission('view_all_companies')
  );

drop policy if exists billing_invoices_select on public.billing_invoices;
create policy billing_invoices_select on public.billing_invoices
  for select
  using (
    (
      company_id = public.current_user_company_id()
      and (
        public.current_user_has_permission('view_billing')
        or public.current_user_has_permission('manage_billing')
        or public.current_user_has_permission('manage_company')
      )
    )
    or public.current_user_has_permission('view_all_companies')
  );

drop policy if exists billing_audit_events_select on public.billing_audit_events;
create policy billing_audit_events_select on public.billing_audit_events
  for select
  using (
    auth.uid() is not null
    and (
      company_id = public.current_user_company_id()
      or public.current_user_has_permission('view_global_audit')
      or public.current_user_has_permission('view_all_companies')
      or (
        company_id is null
        and (
          public.current_user_has_permission('manage_billing')
          or public.current_user_has_permission('manage_company')
        )
      )
    )
  );
