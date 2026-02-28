-- ============================================
-- Migration: 83_rls_regression_scanner.sql
-- Purpose: Read-only RLS regression diagnostics
-- Scope: New diagnostic function only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

create or replace function public.run_rls_regression_scan()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tables_without_rls jsonb := '[]'::jsonb;
  v_tables_without_force jsonb := '[]'::jsonb;
  v_delete_policy_violations jsonb := '[]'::jsonb;
  v_missing_tenant_scope jsonb := '[]'::jsonb;
  v_soft_delete_inconsistencies jsonb := '[]'::jsonb;
begin
  with rels as (
    select c.oid,
           n.nspname,
           c.relname,
           c.relkind,
           c.relrowsecurity,
           c.relforcerowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p')
  )
  select coalesce(jsonb_agg(relname), '[]'::jsonb)
    into v_tables_without_rls
    from rels
   where relrowsecurity = false;

  with rels as (
    select c.oid,
           n.nspname,
           c.relname,
           c.relkind,
           c.relrowsecurity,
           c.relforcerowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p')
  )
  select coalesce(jsonb_agg(relname), '[]'::jsonb)
    into v_tables_without_force
    from rels
   where relforcerowsecurity = false;

  with soft_tables as (
    select distinct table_name
      from information_schema.columns
     where table_schema = 'public'
       and column_name = 'is_deleted'
  )
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'table', p.tablename,
               'policy', p.policyname
             )
           ),
           '[]'::jsonb
         )
    into v_delete_policy_violations
    from pg_policies p
   where p.schemaname = 'public'
     and p.cmd = 'DELETE'
     and p.tablename in (select table_name from soft_tables);

  with company_tables as (
    select distinct table_name
      from information_schema.columns
     where table_schema = 'public'
       and column_name = 'company_id'
  ),
  select_policies as (
    select tablename,
           bool_or(coalesce(qual, '') ilike '%company_id%') as has_company_filter
      from pg_policies
     where schemaname = 'public'
       and cmd = 'SELECT'
     group by tablename
  ),
  missing_company as (
    select ct.table_name as table_name
      from company_tables ct
      left join select_policies sp on sp.tablename = ct.table_name
     where coalesce(sp.has_company_filter, false) = false
  ),
  soft_without_company as (
    select st.table_name
      from (
        select distinct table_name
          from information_schema.columns
         where table_schema = 'public'
           and column_name = 'is_deleted'
      ) st
      left join company_tables ct on ct.table_name = st.table_name
     where ct.table_name is null
  )
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'table', table_name,
               'reason', reason
             )
           ),
           '[]'::jsonb
         )
    into v_missing_tenant_scope
    from (
      select table_name, 'missing_company_id'::text as reason
        from soft_without_company
      union all
      select table_name, 'select_policy_missing_company_filter'::text as reason
        from missing_company
    ) missing_union;

  with soft_tables as (
    select distinct table_name
      from information_schema.columns
     where table_schema = 'public'
       and column_name = 'is_deleted'
  ),
  select_policies as (
    select tablename,
           bool_or(coalesce(qual, '') ilike '%is_deleted%') as has_is_deleted_filter
      from pg_policies
     where schemaname = 'public'
       and cmd = 'SELECT'
     group by tablename
  )
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'table', st.table_name,
               'reason', 'select_policy_missing_is_deleted_filter'
             )
           ),
           '[]'::jsonb
         )
    into v_soft_delete_inconsistencies
    from soft_tables st
    left join select_policies sp on sp.tablename = st.table_name
   where coalesce(sp.has_is_deleted_filter, false) = false;

  return jsonb_build_object(
    'tables_without_rls', v_tables_without_rls,
    'tables_without_force_rls', v_tables_without_force,
    'delete_policy_violations', v_delete_policy_violations,
    'missing_tenant_scope', v_missing_tenant_scope,
    'soft_delete_inconsistencies', v_soft_delete_inconsistencies
  );
end;
$$;
