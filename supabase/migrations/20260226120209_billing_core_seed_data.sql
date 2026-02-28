-- ============================================
-- Migration: 20260226120209_billing_core_seed_data.sql
-- Purpose : Billing feature, plan, and entitlement seed data
-- Scope   : Additive + replay-safe
-- ============================================

insert into public.billing_features (feature_key, feature_type, module, description, is_active)
values
  ('feature.core_employee_management', 'boolean', 'hr', 'Core employee directory and profile management', true),
  ('feature.core_attendance', 'boolean', 'attendance', 'Attendance tracking and review', true),
  ('feature.core_leave_management', 'boolean', 'leave', 'Leave balances, requests, and approvals', true),
  ('feature.core_notifications', 'boolean', 'notifications', 'In-app notification workflows', true),
  ('feature.unified_approvals_workspace', 'boolean', 'workflow', 'Unified approvals across modules', true),
  ('feature.payroll_runs', 'boolean', 'payroll', 'Payroll run execution and history', true),
  ('feature.payslip_history_detail', 'boolean', 'payroll', 'Payslip history and detail visibility', true),
  ('feature.payslip_email_dispatch', 'boolean', 'payroll', 'Payslip email dispatch workflows', true),
  ('feature.project_management_core', 'boolean', 'projects', 'Core project and task management', true),
  ('feature.project_management_advanced', 'boolean', 'projects', 'Advanced project workflows and controls', true),
  ('feature.financial_obligations_loans_advances', 'boolean', 'finance', 'Loans and salary advances module', true),
  ('feature.analytics_standard', 'boolean', 'analytics', 'Standard dashboard analytics', true),
  ('feature.analytics_advanced', 'boolean', 'analytics', 'Advanced analytics and executive metrics', true),
  ('feature.security_intelligence', 'boolean', 'security', 'Security intelligence telemetry and review', true),
  ('feature.priority_support', 'boolean', 'support', 'Priority support workflows', true),
  ('feature.audit_export', 'boolean', 'governance', 'Security/governance export surfaces', true),
  ('feature.custom_roles', 'boolean', 'iam', 'Custom RBAC role creation and management', true),
  ('feature.api_access', 'boolean', 'integration', 'API access for external systems', true),
  ('feature.sso_saml', 'boolean', 'auth', 'SAML SSO support', true),
  ('feature.advanced_retention_controls', 'boolean', 'governance', 'Advanced retention controls', true),
  ('feature.advanced_security_intelligence', 'boolean', 'security', 'Advanced security intelligence controls', true),
  ('feature.sla_controls', 'boolean', 'ops', 'SLA controls and observability overlays', true),
  ('limit.active_seats', 'limit_integer', 'billing', 'Maximum active billable seats', true),
  ('limit.payroll_runs_per_month_max', 'limit_integer', 'payroll', 'Maximum payroll runs per month', true),
  ('limit.payslip_emails_per_month_max', 'limit_integer', 'payroll', 'Maximum payslip emails per month', true),
  ('limit.projects_max', 'limit_integer', 'projects', 'Maximum active projects', true),
  ('limit.retention_days', 'limit_integer', 'governance', 'Default retention window in days', true),
  ('limit.api_requests_per_month_max', 'limit_integer', 'integration', 'API request ceiling per month', true)
on conflict (feature_key) do update
  set feature_type = excluded.feature_type,
      module = excluded.module,
      description = excluded.description,
      is_active = excluded.is_active;

insert into public.billing_plans (plan_code, display_name, tier_level, is_public, is_active)
values
  ('trial', 'Trial', 1, false, true),
  ('basic', 'Basic', 2, true, true),
  ('growth', 'Growth', 3, true, true),
  ('pro', 'Pro', 4, true, true),
  ('enterprise', 'Enterprise', 5, true, true)
on conflict (plan_code) do update
  set display_name = excluded.display_name,
      tier_level = excluded.tier_level,
      is_public = excluded.is_public,
      is_active = excluded.is_active,
      updated_at = now();

with plan_rows as (
  select id, plan_code
  from public.billing_plans
  where plan_code in ('trial', 'basic', 'growth', 'pro', 'enterprise')
)
insert into public.billing_plan_versions (
  plan_id,
  version_no,
  billing_interval,
  region_code,
  currency_code,
  seat_pricing_model,
  trial_days,
  is_active
)
select
  plan_rows.id,
  1,
  'monthly',
  'PK',
  'PKR',
  'per_active_seat',
  case when plan_rows.plan_code = 'trial' then 14 else 0 end,
  true
from plan_rows
on conflict (plan_id, version_no) do update
  set billing_interval = excluded.billing_interval,
      region_code = excluded.region_code,
      currency_code = excluded.currency_code,
      seat_pricing_model = excluded.seat_pricing_model,
      trial_days = excluded.trial_days,
      is_active = excluded.is_active,
      updated_at = now();

with latest_plan_versions as (
  select
    bp.plan_code,
    bpv.id as plan_version_id
  from public.billing_plans bp
  join public.billing_plan_versions bpv
    on bpv.plan_id = bp.id
  where bpv.version_no = 1
),
seed_entitlements as (
  select * from (
    values
      ('trial', 'feature.core_employee_management', 'boolean', true, null, null),
      ('trial', 'feature.core_attendance', 'boolean', true, null, null),
      ('trial', 'feature.core_leave_management', 'boolean', true, null, null),
      ('trial', 'feature.core_notifications', 'boolean', true, null, null),
      ('trial', 'feature.payroll_runs', 'boolean', true, null, null),
      ('trial', 'feature.payslip_history_detail', 'boolean', true, null, null),
      ('trial', 'feature.payslip_email_dispatch', 'boolean', true, null, null),
      ('trial', 'feature.project_management_core', 'boolean', true, null, null),
      ('trial', 'feature.unified_approvals_workspace', 'boolean', true, null, null),
      ('trial', 'feature.analytics_standard', 'boolean', true, null, null),
      ('trial', 'limit.active_seats', 'limit_integer', null, 15, null),
      ('trial', 'limit.payroll_runs_per_month_max', 'limit_integer', null, 3, null),
      ('trial', 'limit.payslip_emails_per_month_max', 'limit_integer', null, 1000, null),
      ('trial', 'limit.projects_max', 'limit_integer', null, 20, null),
      ('trial', 'limit.retention_days', 'limit_integer', null, 30, null),

      ('basic', 'feature.core_employee_management', 'boolean', true, null, null),
      ('basic', 'feature.core_attendance', 'boolean', true, null, null),
      ('basic', 'feature.core_leave_management', 'boolean', true, null, null),
      ('basic', 'feature.core_notifications', 'boolean', true, null, null),
      ('basic', 'feature.unified_approvals_workspace', 'boolean', true, null, null),
      ('basic', 'feature.payroll_runs', 'boolean', true, null, null),
      ('basic', 'feature.payslip_history_detail', 'boolean', true, null, null),
      ('basic', 'feature.analytics_standard', 'boolean', true, null, null),
      ('basic', 'limit.active_seats', 'limit_integer', null, 10, null),
      ('basic', 'limit.payroll_runs_per_month_max', 'limit_integer', null, 2, null),
      ('basic', 'limit.payslip_emails_per_month_max', 'limit_integer', null, 500, null),
      ('basic', 'limit.retention_days', 'limit_integer', null, 30, null),

      ('growth', 'feature.core_employee_management', 'boolean', true, null, null),
      ('growth', 'feature.core_attendance', 'boolean', true, null, null),
      ('growth', 'feature.core_leave_management', 'boolean', true, null, null),
      ('growth', 'feature.core_notifications', 'boolean', true, null, null),
      ('growth', 'feature.unified_approvals_workspace', 'boolean', true, null, null),
      ('growth', 'feature.payroll_runs', 'boolean', true, null, null),
      ('growth', 'feature.payslip_history_detail', 'boolean', true, null, null),
      ('growth', 'feature.payslip_email_dispatch', 'boolean', true, null, null),
      ('growth', 'feature.project_management_core', 'boolean', true, null, null),
      ('growth', 'feature.analytics_standard', 'boolean', true, null, null),
      ('growth', 'feature.security_intelligence', 'boolean', true, null, null),
      ('growth', 'feature.priority_support', 'boolean', true, null, null),
      ('growth', 'limit.active_seats', 'limit_integer', null, 75, null),
      ('growth', 'limit.payroll_runs_per_month_max', 'limit_integer', null, 12, null),
      ('growth', 'limit.payslip_emails_per_month_max', 'limit_integer', null, 10000, null),
      ('growth', 'limit.projects_max', 'limit_integer', null, 100, null),
      ('growth', 'limit.retention_days', 'limit_integer', null, 90, null),

      ('pro', 'feature.core_employee_management', 'boolean', true, null, null),
      ('pro', 'feature.core_attendance', 'boolean', true, null, null),
      ('pro', 'feature.core_leave_management', 'boolean', true, null, null),
      ('pro', 'feature.core_notifications', 'boolean', true, null, null),
      ('pro', 'feature.unified_approvals_workspace', 'boolean', true, null, null),
      ('pro', 'feature.payroll_runs', 'boolean', true, null, null),
      ('pro', 'feature.payslip_history_detail', 'boolean', true, null, null),
      ('pro', 'feature.payslip_email_dispatch', 'boolean', true, null, null),
      ('pro', 'feature.project_management_core', 'boolean', true, null, null),
      ('pro', 'feature.project_management_advanced', 'boolean', true, null, null),
      ('pro', 'feature.financial_obligations_loans_advances', 'boolean', true, null, null),
      ('pro', 'feature.analytics_standard', 'boolean', true, null, null),
      ('pro', 'feature.analytics_advanced', 'boolean', true, null, null),
      ('pro', 'feature.security_intelligence', 'boolean', true, null, null),
      ('pro', 'feature.priority_support', 'boolean', true, null, null),
      ('pro', 'feature.audit_export', 'boolean', true, null, null),
      ('pro', 'feature.custom_roles', 'boolean', true, null, null),
      ('pro', 'feature.api_access', 'boolean', true, null, null),
      ('pro', 'limit.active_seats', 'limit_integer', null, 300, null),
      ('pro', 'limit.projects_max', 'limit_integer', null, 1000, null),
      ('pro', 'limit.api_requests_per_month_max', 'limit_integer', null, 500000, null),
      ('pro', 'limit.retention_days', 'limit_integer', null, 365, null),

      ('enterprise', 'feature.core_employee_management', 'boolean', true, null, null),
      ('enterprise', 'feature.core_attendance', 'boolean', true, null, null),
      ('enterprise', 'feature.core_leave_management', 'boolean', true, null, null),
      ('enterprise', 'feature.core_notifications', 'boolean', true, null, null),
      ('enterprise', 'feature.unified_approvals_workspace', 'boolean', true, null, null),
      ('enterprise', 'feature.payroll_runs', 'boolean', true, null, null),
      ('enterprise', 'feature.payslip_history_detail', 'boolean', true, null, null),
      ('enterprise', 'feature.payslip_email_dispatch', 'boolean', true, null, null),
      ('enterprise', 'feature.project_management_core', 'boolean', true, null, null),
      ('enterprise', 'feature.project_management_advanced', 'boolean', true, null, null),
      ('enterprise', 'feature.financial_obligations_loans_advances', 'boolean', true, null, null),
      ('enterprise', 'feature.analytics_standard', 'boolean', true, null, null),
      ('enterprise', 'feature.analytics_advanced', 'boolean', true, null, null),
      ('enterprise', 'feature.security_intelligence', 'boolean', true, null, null),
      ('enterprise', 'feature.advanced_security_intelligence', 'boolean', true, null, null),
      ('enterprise', 'feature.priority_support', 'boolean', true, null, null),
      ('enterprise', 'feature.audit_export', 'boolean', true, null, null),
      ('enterprise', 'feature.custom_roles', 'boolean', true, null, null),
      ('enterprise', 'feature.api_access', 'boolean', true, null, null),
      ('enterprise', 'feature.sso_saml', 'boolean', true, null, null),
      ('enterprise', 'feature.advanced_retention_controls', 'boolean', true, null, null),
      ('enterprise', 'feature.sla_controls', 'boolean', true, null, null),
      ('enterprise', 'limit.active_seats', 'limit_text', null, null, 'custom'),
      ('enterprise', 'limit.api_requests_per_month_max', 'limit_text', null, null, 'custom'),
      ('enterprise', 'limit.retention_days', 'limit_text', null, null, 'custom'),
      ('enterprise', 'limit.projects_max', 'limit_text', null, null, 'custom')
  ) as t(plan_code, feature_key, value_type, bool_value, int_value, text_value)
)
insert into public.billing_plan_entitlements (
  plan_version_id,
  feature_key,
  value_type,
  bool_value,
  int_value,
  text_value
)
select
  lpv.plan_version_id,
  se.feature_key,
  se.value_type,
  se.bool_value,
  se.int_value,
  se.text_value
from seed_entitlements se
join latest_plan_versions lpv
  on lpv.plan_code = se.plan_code
on conflict (plan_version_id, feature_key) do update
  set value_type = excluded.value_type,
      bool_value = excluded.bool_value,
      int_value = excluded.int_value,
      text_value = excluded.text_value;

-- ============================================
-- Summary
-- - Added billing schema + RLS + FORCE RLS
-- - Added permission keys: view_billing/manage_billing
-- - Added tenant-safe helper functions (security invoker)
-- - Seeded feature catalog + plan entitlements (trial/basic/growth/pro/enterprise)
-- ============================================
