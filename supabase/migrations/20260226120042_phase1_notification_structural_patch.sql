-- EMP/supabase/phase1_notification_structural_patch.sql

create or replace function public.validate_notification_company_consistency()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_profile_company_id uuid;
begin
  if new.recipient_profile_id is null then
    return new;
  end if;

  select company_id
    into v_profile_company_id
    from public.user_profiles
   where id = new.recipient_profile_id
     and is_deleted = false;

  if v_profile_company_id is null or v_profile_company_id <> new.company_id then
    raise exception 'notification company mismatch';
  end if;

  return new;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notifications_company_guard'
  ) THEN
    CREATE TRIGGER trg_notifications_company_guard
      BEFORE INSERT OR UPDATE ON public.notifications
      FOR EACH ROW EXECUTE FUNCTION public.validate_notification_company_consistency();
  END IF;
END $$;

create index if not exists notifications_company_recipient_idx
  on public.notifications (company_id, recipient_profile_id)
  where is_deleted = false;

drop policy if exists notifications_insert on public.notifications;

create policy notifications_insert on public.notifications
  for insert
  with check (
    company_id = public.current_user_company_id()
    and recipient_profile_id in (
      select id from public.user_profiles
      where company_id = public.current_user_company_id()
        and is_deleted = false
    )
    and (
      public.current_user_has_permission('manage_employees')
      or public.current_user_has_permission('company_wide_notifications')
    )
  );

-- ============================================
-- PHASE 1 NOTIFICATION STRUCTURAL PATCH SUMMARY
-- ============================================
-- Triggers created: trg_notifications_company_guard
-- Functions created: validate_notification_company_consistency
-- Indexes added: notifications_company_recipient_idx
-- Policies modified: notifications_insert
-- Security hardening: recipient/company consistency + stricter insert permission
-- ============================================
