-- EMP/supabase/notification_engine.sql
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  recipient_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  type text not null,
  title text not null,
  message text,
  reference_type text,
  reference_id uuid,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists notifications_company_id_idx
  on public.notifications (company_id)
  where is_deleted = false;

create index if not exists notifications_recipient_profile_id_idx
  on public.notifications (recipient_profile_id)
  where is_deleted = false;

create index if not exists notifications_is_read_idx
  on public.notifications (is_read)
  where is_deleted = false;

create index if not exists notifications_created_at_idx
  on public.notifications (created_at)
  where is_deleted = false;

alter table public.notifications enable row level security;
alter table public.notifications force row level security;

drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_insert on public.notifications;
drop policy if exists notifications_update on public.notifications;

create policy notifications_select on public.notifications
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and recipient_profile_id = (
      select id from public.user_profiles
      where user_id = auth.uid()
        and is_deleted = false
    )
  );

create policy notifications_insert on public.notifications
  for insert
  with check (
    company_id = public.current_user_company_id()
    and recipient_profile_id in (
      select id from public.user_profiles
      where company_id = public.current_user_company_id()
        and is_deleted = false
    )
    and public.current_user_has_permission('manage_employees')
  );

create policy notifications_update on public.notifications
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and recipient_profile_id = (
      select id from public.user_profiles
      where user_id = auth.uid()
        and is_deleted = false
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and recipient_profile_id = (
      select id from public.user_profiles
      where user_id = auth.uid()
        and is_deleted = false
    )
    and exists (
      select 1 from public.notifications n
      where n.id = id
        and n.company_id = company_id
        and n.recipient_profile_id = recipient_profile_id
        and n.type is not distinct from type
        and n.title is not distinct from title
        and n.message is not distinct from message
        and n.reference_type is not distinct from reference_type
        and n.reference_id is not distinct from reference_id
        and n.created_at is not distinct from created_at
        and n.created_by is not distinct from created_by
        and n.is_deleted is not distinct from is_deleted
        and n.deleted_at is not distinct from deleted_at
        and n.deleted_by is not distinct from deleted_by
    )
  );

create trigger trg_notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();
