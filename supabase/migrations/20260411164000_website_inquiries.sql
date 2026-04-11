create table if not exists public.website_inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_kind text not null check (inquiry_kind in ('contact', 'demo', 'workspace_request')),
  status text not null default 'new' check (status in ('new', 'reviewed', 'closed')),
  name text not null,
  email text not null,
  company text not null,
  message text,
  team_size text,
  buyer_role text,
  buying_timeline text,
  source_path text not null default '/',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  request_ip text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.website_inquiries is 'Public website demo, contact, and guided workspace access submissions.';

create index if not exists website_inquiries_kind_created_at_idx
  on public.website_inquiries (inquiry_kind, created_at desc);

create index if not exists website_inquiries_status_created_at_idx
  on public.website_inquiries (status, created_at desc);

create index if not exists website_inquiries_email_created_at_idx
  on public.website_inquiries (lower(email), created_at desc);

alter table public.website_inquiries enable row level security;

revoke all on public.website_inquiries from anon, authenticated;
grant all on table public.website_inquiries to service_role;
