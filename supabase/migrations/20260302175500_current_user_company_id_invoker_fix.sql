-- Restore current_user_company_id() to SECURITY INVOKER.
-- auth_sessions policies were already decoupled from this function in 20260302174500.
-- This avoids permission issues triggered by SECURITY DEFINER ownership context.

create or replace function public.current_user_company_id()
returns uuid
language sql
security invoker
set search_path = public
stable
as $$
  select up.company_id
  from public.user_profiles up
  where up.user_id = auth.uid()
    and up.is_deleted = false
  limit 1
$$;

grant execute on function public.current_user_company_id() to anon, authenticated, service_role;
