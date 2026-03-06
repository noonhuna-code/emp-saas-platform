-- Ensure employee scope helpers are tenant-scoped to the active company.
-- Non-destructive: function replacement only.

create or replace function public.current_user_employee_id()
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select e.id
  from public.employees e
  join public.user_profiles up on up.id = e.user_profile_id
  where up.user_id = auth.uid()
    and up.company_id = public.current_user_company_id()
    and up.is_deleted = false
    and e.company_id = public.current_user_company_id()
    and e.is_deleted = false
  order by e.created_at asc
  limit 1
$$;

create or replace function public.current_user_scope_employee_ids()
returns setof uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select set_config('row_security','off', true);
  with actor_profile as (
    select up.id as user_profile_id
    from public.user_profiles up
    where up.user_id = auth.uid()
      and up.company_id = public.current_user_company_id()
      and up.is_deleted = false
    limit 1
  ),
  actor_employee as (
    select e.id as employee_id, e.department_id, e.team_id, e.manager_id
    from public.employees e
    join actor_profile ap on ap.user_profile_id = e.user_profile_id
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
  ),
  self_scope as (
    select employee_id from actor_employee
  ),
  team_scope as (
    select e.id
    from public.employees e
    join public.teams t on t.id = e.team_id
    join actor_profile ap on ap.user_profile_id = t.team_lead_id
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
  ),
  manager_scope as (
    select e.id
    from public.employees e
    join actor_employee ae on ae.employee_id = e.manager_id
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
  ),
  department_scope as (
    select e.id
    from public.employees e
    join actor_employee ae on ae.department_id = e.department_id
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
  ),
  company_scope as (
    select e.id
    from public.employees e
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
      and (
        public.current_user_has_permission('manage_attendance')
        or public.current_user_has_permission('override_attendance')
        or public.current_user_has_permission('approve_attendance')
        or public.current_user_has_permission('manage_escalations')
        or public.current_user_has_permission('assign_shifts')
        or public.current_user_has_permission('manage_shifts')
        or public.current_user_has_permission('view_attendance')
      )
  )
  select distinct employee_id from (
    select employee_id from self_scope
    union all
    select id from team_scope
    union all
    select id from manager_scope
    union all
    select id from department_scope
    union all
    select id from company_scope
  ) q
$$;
