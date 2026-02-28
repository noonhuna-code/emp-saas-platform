-- ============================================
-- Migration: 84_soc2_control_mapping.sql
-- Purpose: SOC2 control mapping registry (append-only)
-- Scope: New table + RLS + seed data
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.compliance_controls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  control_id text not null,
  domain text not null,
  description text not null,
  automated_check text null,
  last_verified_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint compliance_controls_unique unique (company_id, control_id)
);

create index if not exists compliance_controls_company_id_idx
  on public.compliance_controls (company_id);

alter table public.compliance_controls enable row level security;
alter table public.compliance_controls force row level security;

drop policy if exists compliance_controls_select on public.compliance_controls;
drop policy if exists compliance_controls_insert on public.compliance_controls;
drop policy if exists compliance_controls_update on public.compliance_controls;
drop policy if exists compliance_controls_delete on public.compliance_controls;

create policy compliance_controls_select on public.compliance_controls
  for select
  using (company_id = public.current_user_company_id());

create policy compliance_controls_insert on public.compliance_controls
  for insert
  with check (company_id = public.current_user_company_id());

insert into public.compliance_controls (
  company_id,
  control_id,
  domain,
  description,
  automated_check,
  created_at
)
select
  c.id,
  seed.control_id,
  seed.domain,
  seed.description,
  seed.automated_check,
  now()
from public.companies c
cross join (
  values
    ('RLS_ENFORCED', 'Security', 'RLS enabled and forced on tenant tables', 'run_rls_regression_scan'),
    ('NO_SECURITY_DEFINER', 'Security', 'No SECURITY DEFINER functions in migrations', null),
    ('AUDIT_IMMUTABILITY', 'Processing Integrity', 'Approval and audit logs are append-only', null),
    ('IDEMPOTENCY_ENFORCED', 'Processing Integrity', 'Idempotency keys enforced on mutations', null),
    ('RATE_LIMIT_ENFORCED', 'Availability', 'Rate limiting enforced on mutation endpoints', null),
    ('TENANT_ISOLATION', 'Confidentiality', 'Tenant isolation enforced in service + RLS', 'run_rls_regression_scan')
) as seed(control_id, domain, description, automated_check)
where c.is_deleted = false
on conflict (company_id, control_id) do nothing;
