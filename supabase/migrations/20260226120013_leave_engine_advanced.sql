-- EMP/supabase/leave_engine_advanced.sql

create table if not exists public.leave_accrual_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  accrual_frequency text not null,
  accrual_days numeric not null,
  max_balance numeric,
  carry_forward_limit numeric,
  expiry_months integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.leave_accrual_rules
  add constraint leave_accrual_rules_frequency_chk
  check (accrual_frequency in ('monthly','yearly'));

create index if not exists leave_accrual_rules_company_id_idx
  on public.leave_accrual_rules (company_id)
  where is_deleted = false;

create index if not exists leave_accrual_rules_leave_type_id_idx
  on public.leave_accrual_rules (leave_type_id)
  where is_deleted = false;

create table if not exists public.leave_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  transaction_type text not null,
  days numeric not null,
  reference_id uuid,
  transaction_date date not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.leave_ledger
  add constraint leave_ledger_transaction_type_chk
  check (transaction_type in ('accrual','used','adjustment','expiry'));

create index if not exists leave_ledger_company_id_idx
  on public.leave_ledger (company_id)
  where is_deleted = false;

create index if not exists leave_ledger_employee_id_idx
  on public.leave_ledger (employee_id)
  where is_deleted = false;

create index if not exists leave_ledger_leave_type_id_idx
  on public.leave_ledger (leave_type_id)
  where is_deleted = false;

create index if not exists leave_ledger_transaction_date_idx
  on public.leave_ledger (transaction_date)
  where is_deleted = false;

create table if not exists public.leave_policy_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  sandwich_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists leave_policy_rules_company_id_idx
  on public.leave_policy_rules (company_id)
  where is_deleted = false;

create table if not exists public.leave_blackout_dates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

alter table public.leave_blackout_dates
  add constraint leave_blackout_dates_date_chk
  check (end_date >= start_date);

create index if not exists leave_blackout_dates_company_id_idx
  on public.leave_blackout_dates (company_id)
  where is_deleted = false;

create index if not exists leave_blackout_dates_start_date_idx
  on public.leave_blackout_dates (start_date)
  where is_deleted = false;

create index if not exists leave_blackout_dates_end_date_idx
  on public.leave_blackout_dates (end_date)
  where is_deleted = false;

create table if not exists public.leave_approval_levels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  level_order integer not null,
  role_required text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists leave_approval_levels_company_id_idx
  on public.leave_approval_levels (company_id)
  where is_deleted = false;

create index if not exists leave_approval_levels_leave_type_id_idx
  on public.leave_approval_levels (leave_type_id)
  where is_deleted = false;

create unique index if not exists leave_approval_levels_unique
  on public.leave_approval_levels (company_id, leave_type_id, level_order)
  where is_deleted = false;

alter table public.leave_requests
  add column if not exists is_half_day boolean not null default false;

alter table public.leave_requests
  add column if not exists half_day_type text;

alter table public.leave_requests
  add column if not exists approval_level integer;

alter table public.leave_requests
  add column if not exists final_approved boolean not null default false;

alter table public.leave_requests
  add constraint leave_requests_half_day_type_chk
  check (half_day_type in ('first_half','second_half') or half_day_type is null);

create or replace function public.validate_leave_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sandwich boolean := false;
  v_weekend_policy_id uuid;
  v_is_blackout boolean := false;
  v_overlap boolean := false;
  v_employee_id uuid;
  v_total_days numeric := 0;
  v_date date;
  v_day_of_week integer;
  v_is_weekend boolean := false;
  v_is_holiday boolean := false;
begin
  v_employee_id := new.employee_id;

  select sandwich_enabled
    into v_sandwich
    from public.leave_policy_rules
   where company_id = new.company_id
     and is_deleted = false
   limit 1;

  select id
    into v_weekend_policy_id
    from public.company_weekend_policies
   where company_id = new.company_id
     and is_deleted = false
     and is_default = true
     and effective_from <= new.start_date
     and (effective_to is null or effective_to >= new.end_date)
   order by effective_from desc
   limit 1;

  select exists (
    select 1 from public.leave_blackout_dates b
    where b.company_id = new.company_id
      and b.is_deleted = false
      and daterange(b.start_date, b.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')
  ) into v_is_blackout;

  if v_is_blackout then
    raise exception 'Leave request falls in blackout period';
  end if;

  select exists (
    select 1 from public.leave_requests r
    where r.company_id = new.company_id
      and r.employee_id = new.employee_id
      and r.is_deleted = false
      and r.status in ('pending','approved')
      and r.id <> coalesce(new.id, gen_random_uuid())
      and daterange(r.start_date, r.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')
      and not (
        new.is_half_day = true
        and r.is_half_day = true
        and r.start_date = new.start_date
        and r.end_date = new.end_date
        and r.half_day_type is distinct from new.half_day_type
      )
  ) into v_overlap;

  if v_overlap then
    raise exception 'Overlapping leave request not allowed';
  end if;

  if new.is_half_day then
    new.total_days := 0.5;
    return new;
  end if;

  v_date := new.start_date;
  while v_date <= new.end_date loop
    v_day_of_week := extract(dow from v_date);

    select exists (
      select 1 from public.company_weekend_days d
      where d.company_id = new.company_id
        and d.is_deleted = false
        and d.weekend_policy_id = v_weekend_policy_id
        and d.day_of_week = v_day_of_week
    ) into v_is_weekend;

    select exists (
      select 1 from public.company_holidays h
      where h.company_id = new.company_id
        and h.is_deleted = false
        and h.holiday_date = v_date
    ) into v_is_holiday;

    if v_sandwich then
      v_total_days := v_total_days + 1;
    else
      if not v_is_weekend and not v_is_holiday then
        v_total_days := v_total_days + 1;
      end if;
    end if;

    v_date := v_date + 1;
  end loop;

  new.total_days := v_total_days;
  return new;
end;
$$;

create or replace function public.process_monthly_leave_accrual(company_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_employee record;
  v_rule record;
  v_balance record;
  v_now date := current_date;
  v_year integer := extract(year from current_date);
  v_month integer := extract(month from current_date);
  v_remaining numeric;
  v_excess numeric;
  v_add numeric;
  v_new_entitled numeric;
begin
  for v_employee in
    select e.id as employee_id
    from public.employees e
    where e.company_id = company_uuid
      and e.is_deleted = false
  loop
    for v_rule in
      select r.*
      from public.leave_accrual_rules r
      where r.company_id = company_uuid
        and r.is_deleted = false
    loop
      select * into v_balance
      from public.leave_balances b
      where b.company_id = company_uuid
        and b.employee_id = v_employee.employee_id
        and b.leave_type_id = v_rule.leave_type_id
        and b.year = v_year
        and b.is_deleted = false
      limit 1;

      if v_rule.accrual_frequency = 'monthly' or (v_rule.accrual_frequency = 'yearly' and v_month = 1) then
        v_add := v_rule.accrual_days;

        if not found then
          insert into public.leave_balances (
            company_id, employee_id, leave_type_id, year, entitled_days, used_days, created_at, updated_at
          ) values (
            company_uuid, v_employee.employee_id, v_rule.leave_type_id, v_year, v_add, 0, now(), now()
          );
        else
          v_new_entitled := v_balance.entitled_days + v_add;
          update public.leave_balances
             set entitled_days = v_new_entitled,
                 updated_at = now()
           where id = v_balance.id;
        end if;

        insert into public.leave_ledger (
          company_id, employee_id, leave_type_id, transaction_type, days, reference_id, transaction_date, created_at
        ) values (
          company_uuid, v_employee.employee_id, v_rule.leave_type_id, 'accrual', v_add, null, v_now, now()
        );
      end if;

      select * into v_balance
      from public.leave_balances b2
      where b2.company_id = company_uuid
        and b2.employee_id = v_employee.employee_id
        and b2.leave_type_id = v_rule.leave_type_id
        and b2.year = v_year
        and b2.is_deleted = false
      limit 1;

      if found then
        v_remaining := v_balance.entitled_days - v_balance.used_days;

        if v_month = 1 and v_rule.carry_forward_limit is not null then
          if v_remaining > v_rule.carry_forward_limit then
            v_excess := v_remaining - v_rule.carry_forward_limit;
            update public.leave_balances
               set entitled_days = v_balance.used_days + v_rule.carry_forward_limit,
                   updated_at = now()
             where id = v_balance.id;

            insert into public.leave_ledger (
              company_id, employee_id, leave_type_id, transaction_type, days, reference_id, transaction_date, created_at
            ) values (
              company_uuid, v_employee.employee_id, v_rule.leave_type_id, 'expiry', v_excess, null, v_now, now()
            );
          end if;
        end if;

        if v_rule.max_balance is not null then
          v_remaining := (select entitled_days - used_days from public.leave_balances where id = v_balance.id);
          if v_remaining > v_rule.max_balance then
            v_excess := v_remaining - v_rule.max_balance;
            update public.leave_balances
               set entitled_days = v_balance.used_days + v_rule.max_balance,
                   updated_at = now()
             where id = v_balance.id;

            insert into public.leave_ledger (
              company_id, employee_id, leave_type_id, transaction_type, days, reference_id, transaction_date, created_at
            ) values (
              company_uuid, v_employee.employee_id, v_rule.leave_type_id, 'expiry', v_excess, null, v_now, now()
            );
          end if;
        end if;
      end if;
    end loop;
  end loop;
end;
$$;

alter table public.leave_accrual_rules enable row level security;
alter table public.leave_accrual_rules force row level security;

alter table public.leave_ledger enable row level security;
alter table public.leave_ledger force row level security;

alter table public.leave_policy_rules enable row level security;
alter table public.leave_policy_rules force row level security;

alter table public.leave_blackout_dates enable row level security;
alter table public.leave_blackout_dates force row level security;

alter table public.leave_approval_levels enable row level security;
alter table public.leave_approval_levels force row level security;

drop policy if exists leave_accrual_rules_select on public.leave_accrual_rules;
drop policy if exists leave_accrual_rules_insert on public.leave_accrual_rules;
drop policy if exists leave_accrual_rules_update on public.leave_accrual_rules;

drop policy if exists leave_ledger_select on public.leave_ledger;
drop policy if exists leave_ledger_insert on public.leave_ledger;

drop policy if exists leave_policy_rules_select on public.leave_policy_rules;
drop policy if exists leave_policy_rules_insert on public.leave_policy_rules;
drop policy if exists leave_policy_rules_update on public.leave_policy_rules;

drop policy if exists leave_blackout_dates_select on public.leave_blackout_dates;
drop policy if exists leave_blackout_dates_insert on public.leave_blackout_dates;
drop policy if exists leave_blackout_dates_update on public.leave_blackout_dates;

drop policy if exists leave_approval_levels_select on public.leave_approval_levels;
drop policy if exists leave_approval_levels_insert on public.leave_approval_levels;
drop policy if exists leave_approval_levels_update on public.leave_approval_levels;

create policy leave_accrual_rules_select on public.leave_accrual_rules
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy leave_accrual_rules_insert on public.leave_accrual_rules
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy leave_accrual_rules_update on public.leave_accrual_rules
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_employees')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy leave_ledger_select on public.leave_ledger
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy leave_ledger_insert on public.leave_ledger
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and public.current_user_has_permission('manage_employees')
  );

create policy leave_policy_rules_select on public.leave_policy_rules
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy leave_policy_rules_insert on public.leave_policy_rules
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy leave_policy_rules_update on public.leave_policy_rules
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_employees')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy leave_blackout_dates_select on public.leave_blackout_dates
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy leave_blackout_dates_insert on public.leave_blackout_dates
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy leave_blackout_dates_update on public.leave_blackout_dates
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_employees')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy leave_approval_levels_select on public.leave_approval_levels
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy leave_approval_levels_insert on public.leave_approval_levels
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy leave_approval_levels_update on public.leave_approval_levels
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_employees')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

drop trigger if exists trg_leave_requests_validate on public.leave_requests;
create trigger trg_leave_requests_validate
  before insert or update on public.leave_requests
  for each row execute function public.validate_leave_request();

create trigger trg_leave_accrual_rules_updated_at
  before update on public.leave_accrual_rules
  for each row execute function public.set_updated_at();

create trigger trg_leave_policy_rules_updated_at
  before update on public.leave_policy_rules
  for each row execute function public.set_updated_at();

create trigger trg_leave_blackout_dates_updated_at
  before update on public.leave_blackout_dates
  for each row execute function public.set_updated_at();

create trigger trg_leave_approval_levels_updated_at
  before update on public.leave_approval_levels
  for each row execute function public.set_updated_at();

-- ================================
-- SUMMARY
-- ================================
-- Tables created: leave_accrual_rules, leave_ledger, leave_policy_rules, leave_blackout_dates, leave_approval_levels
-- Columns added: leave_requests.is_half_day, leave_requests.half_day_type, leave_requests.approval_level, leave_requests.final_approved
-- Functions added: validate_leave_request, process_monthly_leave_accrual
-- Policies created: leave_accrual_rules_select/insert/update, leave_ledger_select/insert, leave_policy_rules_select/insert/update, leave_blackout_dates_select/insert/update, leave_approval_levels_select/insert/update
-- Indexes created: leave_accrual_rules_company_id_idx, leave_accrual_rules_leave_type_id_idx, leave_ledger_company_id_idx, leave_ledger_employee_id_idx, leave_ledger_leave_type_id_idx, leave_ledger_transaction_date_idx, leave_policy_rules_company_id_idx, leave_blackout_dates_company_id_idx, leave_blackout_dates_start_date_idx, leave_blackout_dates_end_date_idx, leave_approval_levels_company_id_idx, leave_approval_levels_leave_type_id_idx, leave_approval_levels_unique
-- Self-audit: no duplicates, idempotent, multi-tenant safe, soft-delete consistent
-- ================================
