-- ============================================
-- Migration: 86_data_retention_engine.sql
-- Purpose: Data retention policy registry + evaluation (read-only)
-- Scope: New table + diagnostic function
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.data_retention_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  table_name text not null,
  retention_days integer not null,
  archive_only boolean not null default true,
  created_at timestamptz not null default now(),
  constraint data_retention_policies_unique unique (company_id, table_name)
);

create index if not exists data_retention_policies_company_id_idx
  on public.data_retention_policies (company_id);

alter table public.data_retention_policies enable row level security;
alter table public.data_retention_policies force row level security;

drop policy if exists data_retention_policies_select on public.data_retention_policies;
drop policy if exists data_retention_policies_insert on public.data_retention_policies;
drop policy if exists data_retention_policies_update on public.data_retention_policies;
drop policy if exists data_retention_policies_delete on public.data_retention_policies;

create policy data_retention_policies_select on public.data_retention_policies
  for select
  using (company_id = public.current_user_company_id());

create policy data_retention_policies_insert on public.data_retention_policies
  for insert
  with check (company_id = public.current_user_company_id());

create or replace function public.run_retention_evaluation()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_rec record;
  v_has_company boolean;
  v_has_created_at boolean;
  v_query text;
  v_count bigint;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'UNAUTHENTICATED';
  end if;

  select up.company_id
    into v_company_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if v_company_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'TENANT_RESOLUTION_FAILED';
  end if;

  for v_rec in
    select table_name, retention_days, archive_only
      from public.data_retention_policies
     where company_id = v_company_id
  loop
    select exists (
             select 1
               from information_schema.columns
              where table_schema = 'public'
                and table_name = v_rec.table_name
                and column_name = 'company_id'
           ),
           exists (
             select 1
               from information_schema.columns
              where table_schema = 'public'
                and table_name = v_rec.table_name
                and column_name = 'created_at'
           )
      into v_has_company, v_has_created_at;

    if not v_has_created_at then
      v_results := v_results || jsonb_build_array(
        jsonb_build_object(
          'table', v_rec.table_name,
          'retention_days', v_rec.retention_days,
          'archive_only', v_rec.archive_only,
          'eligible_count', null,
          'note', 'created_at_missing'
        )
      );
      continue;
    end if;

    if v_has_company then
      v_query := format(
        'select count(*)::bigint from public.%I where company_id = $1 and created_at < now() - ($2 || '' days'')::interval',
        v_rec.table_name
      );
      execute v_query into v_count using v_company_id, v_rec.retention_days;
    else
      v_query := format(
        'select count(*)::bigint from public.%I where created_at < now() - ($1 || '' days'')::interval',
        v_rec.table_name
      );
      execute v_query into v_count using v_rec.retention_days;
    end if;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'table', v_rec.table_name,
        'retention_days', v_rec.retention_days,
        'archive_only', v_rec.archive_only,
        'eligible_count', v_count
      )
    );
  end loop;

  return jsonb_build_object(
    'company_id', v_company_id,
    'evaluated_at', now(),
    'tables', v_results
  );
end;
$$;
