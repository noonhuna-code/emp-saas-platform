-- ============================================
-- Migration: 76_request_trace_partitioning.sql
-- Purpose: Future request trace partitioning without rewriting existing data
-- Scope: New partitioned table + partitions + view
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.request_traces_partitioned (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  request_id text not null,
  endpoint text not null,
  actor_profile_id uuid references public.user_profiles(id) on delete restrict,
  duration_ms integer,
  status_code integer,
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);

create index if not exists request_traces_partitioned_company_created_at_idx
  on public.request_traces_partitioned (company_id, created_at);

create index if not exists request_traces_partitioned_company_request_id_idx
  on public.request_traces_partitioned (company_id, request_id);

alter table public.request_traces_partitioned enable row level security;
alter table public.request_traces_partitioned force row level security;

drop policy if exists request_traces_partitioned_select on public.request_traces_partitioned;
drop policy if exists request_traces_partitioned_insert on public.request_traces_partitioned;

create policy request_traces_partitioned_select on public.request_traces_partitioned
  for select
  using (company_id = public.current_user_company_id());

create policy request_traces_partitioned_insert on public.request_traces_partitioned
  for insert
  with check (company_id = public.current_user_company_id());

-- Create current + next month partitions (safe for new writes)
do $$
declare
  v_start date := date_trunc('month', now())::date;
  v_next date := (v_start + interval '1 month')::date;
  v_next2 date := (v_start + interval '2 month')::date;
  v_curr_name text := format('request_traces_%s', to_char(v_start, 'YYYY_MM'));
  v_next_name text := format('request_traces_%s', to_char(v_next, 'YYYY_MM'));
begin
  execute format(
    'create table if not exists public.%I partition of public.request_traces_partitioned for values from (%L) to (%L)',
    v_curr_name, v_start, v_next
  );

  execute format(
    'create table if not exists public.%I partition of public.request_traces_partitioned for values from (%L) to (%L)',
    v_next_name, v_next, v_next2
  );
end $$;

create table if not exists public.request_traces_default
  partition of public.request_traces_partitioned default;

-- Unified view across legacy + partitioned traces
create or replace view public.v_request_traces_all as
  select *
    from public.request_traces
   where company_id = public.current_user_company_id()
  union all
  select *
    from public.request_traces_partitioned
   where company_id = public.current_user_company_id();
