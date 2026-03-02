-- Fix login session creation failure caused by auth_sessions policies
-- referencing current_user_company_id() during INSERT/UPDATE checks.
-- Non-destructive, replay-safe.

drop policy if exists auth_sessions_select on public.auth_sessions;
drop policy if exists auth_sessions_insert on public.auth_sessions;
drop policy if exists auth_sessions_update on public.auth_sessions;

create policy auth_sessions_select on public.auth_sessions
  for select
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.user_profiles up
      where up.id = auth_sessions.profile_id
        and up.user_id = auth.uid()
        and up.company_id = auth_sessions.company_id
        and up.is_deleted = false
    )
  );

create policy auth_sessions_insert on public.auth_sessions
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.user_profiles up
      where up.id = auth_sessions.profile_id
        and up.user_id = auth.uid()
        and up.company_id = auth_sessions.company_id
        and up.is_deleted = false
    )
  );

create policy auth_sessions_update on public.auth_sessions
  for update
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.user_profiles up
      where up.id = auth_sessions.profile_id
        and up.user_id = auth.uid()
        and up.company_id = auth_sessions.company_id
        and up.is_deleted = false
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.user_profiles up
      where up.id = auth_sessions.profile_id
        and up.user_id = auth.uid()
        and up.company_id = auth_sessions.company_id
        and up.is_deleted = false
    )
  );
