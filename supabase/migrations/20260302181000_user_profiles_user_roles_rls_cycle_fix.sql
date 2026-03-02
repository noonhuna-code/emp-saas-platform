-- Break recursive RLS dependency between user_profiles/user_roles/current_user_company_id.
-- Non-destructive, replay-safe policy replacement.

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select
  using (user_id = auth.uid());

drop policy if exists user_profiles_select_company on public.user_profiles;
create policy user_profiles_select_company on public.user_profiles
  for select
  using (
    is_deleted = false
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.company_id = user_profiles.company_id
    )
  );
