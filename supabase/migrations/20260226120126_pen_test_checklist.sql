-- ============================================
-- Migration: 87_pen_test_checklist.sql
-- Purpose: Security testing evidence log (append-only)
-- Scope: New table + RLS + seed checklist
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.security_test_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  category text not null,
  test_name text not null,
  result text not null,
  notes text,
  executed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint security_test_events_unique unique (company_id, category, test_name, executed_at)
);

create index if not exists security_test_events_company_id_idx
  on public.security_test_events (company_id);

alter table public.security_test_events enable row level security;
alter table public.security_test_events force row level security;

drop policy if exists security_test_events_select on public.security_test_events;
drop policy if exists security_test_events_insert on public.security_test_events;
drop policy if exists security_test_events_update on public.security_test_events;
drop policy if exists security_test_events_delete on public.security_test_events;

create policy security_test_events_select on public.security_test_events
  for select
  using (company_id = public.current_user_company_id());

create policy security_test_events_insert on public.security_test_events
  for insert
  with check (company_id = public.current_user_company_id());

insert into public.security_test_events (
  company_id,
  category,
  test_name,
  result,
  notes,
  executed_at,
  created_at
)
select
  c.id,
  seed.category,
  seed.test_name,
  'pending',
  'seeded checklist item',
  now(),
  now()
from public.companies c
cross join (
  values
    ('Auth', 'Brute force login'),
    ('Security', 'Cross-tenant access attempt'),
    ('Integrity', 'Stale update race'),
    ('Security', 'IDOR test'),
    ('RLS', 'RLS bypass attempt'),
    ('SoftDelete', 'Soft-delete exposure'),
    ('Audit', 'Audit immutability test')
) as seed(category, test_name)
where c.is_deleted = false
on conflict do nothing;
