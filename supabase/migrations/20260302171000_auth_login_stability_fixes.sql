-- Fix auth login stack overflow and auth rate limit upsert conflict
-- Non-destructive, replay-safe

create or replace function public.current_user_company_id()
returns uuid
language sql
security definer
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

create or replace function public.auth_rate_limit_check(
  p_identifier_type text,
  p_identifier_hash text,
  p_window_seconds integer,
  p_max_attempts integer,
  p_lock_minutes integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_window_start timestamptz;
  v_attempt_count integer;
  v_lock_level integer;
  v_locked_until timestamptz;
  v_now timestamptz := now();
  v_lock_minutes integer;
  v_rowcount integer;
begin
  if p_identifier_type is null
     or p_identifier_hash is null
     or p_window_seconds is null
     or p_max_attempts is null
     or p_lock_minutes is null then
    raise exception using errcode = 'P0001', message = 'RATE_LIMIT_INVALID';
  end if;

  if p_window_seconds <= 0 or p_max_attempts <= 0 or p_lock_minutes <= 0 then
    raise exception using errcode = 'P0001', message = 'RATE_LIMIT_INVALID';
  end if;

  if p_identifier_type not in ('ip', 'email') then
    raise exception using errcode = 'P0001', message = 'RATE_LIMIT_INVALID';
  end if;

  if auth.uid() is not null then
    select up.company_id
      into v_company_id
      from public.user_profiles up
     where up.user_id = auth.uid()
       and up.is_deleted = false
     limit 1;
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  if v_company_id is null then
    update public.auth_rate_limits
       set attempt_count = public.auth_rate_limits.attempt_count + 1,
           updated_at = v_now
     where company_id is null
       and identifier_type = p_identifier_type
       and identifier_hash = p_identifier_hash
       and window_start = v_window_start
    returning attempt_count, lock_level, locked_until
      into v_attempt_count, v_lock_level, v_locked_until;

    if not found then
      begin
        insert into public.auth_rate_limits (
          company_id,
          identifier_type,
          identifier_hash,
          window_start,
          attempt_count,
          locked_until,
          lock_level,
          created_at,
          updated_at
        ) values (
          null,
          p_identifier_type,
          p_identifier_hash,
          v_window_start,
          1,
          null,
          0,
          v_now,
          v_now
        )
        returning attempt_count, lock_level, locked_until
          into v_attempt_count, v_lock_level, v_locked_until;
      exception when unique_violation then
        update public.auth_rate_limits
           set attempt_count = public.auth_rate_limits.attempt_count + 1,
               updated_at = v_now
         where company_id is null
           and identifier_type = p_identifier_type
           and identifier_hash = p_identifier_hash
           and window_start = v_window_start
        returning attempt_count, lock_level, locked_until
          into v_attempt_count, v_lock_level, v_locked_until;
      end;
    end if;
  else
    insert into public.auth_rate_limits (
      company_id,
      identifier_type,
      identifier_hash,
      window_start,
      attempt_count,
      locked_until,
      lock_level,
      created_at,
      updated_at
    ) values (
      v_company_id,
      p_identifier_type,
      p_identifier_hash,
      v_window_start,
      1,
      null,
      0,
      v_now,
      v_now
    )
    on conflict (company_id, identifier_type, identifier_hash, window_start) do update
      set attempt_count = public.auth_rate_limits.attempt_count + 1,
          updated_at = v_now
    returning attempt_count, lock_level, locked_until
      into v_attempt_count, v_lock_level, v_locked_until;
  end if;

  get diagnostics v_rowcount = row_count;
  if v_rowcount <> 1 then
    raise exception using errcode = 'P0001', message = 'RATE_LIMIT_INVALID';
  end if;

  if v_attempt_count >= p_max_attempts then
    v_lock_level := v_lock_level + 1;
    v_lock_minutes := (p_lock_minutes * power(2, v_lock_level))::int;
    if v_lock_minutes > 1440 then
      v_lock_minutes := 1440;
    end if;

    v_locked_until := v_now + make_interval(mins => v_lock_minutes);

    if v_company_id is null then
      update public.auth_rate_limits
         set lock_level = v_lock_level,
             locked_until = v_locked_until,
             updated_at = v_now
       where company_id is null
         and identifier_type = p_identifier_type
         and identifier_hash = p_identifier_hash
         and window_start = v_window_start;
    else
      update public.auth_rate_limits
         set lock_level = v_lock_level,
             locked_until = v_locked_until,
             updated_at = v_now
       where company_id = v_company_id
         and identifier_type = p_identifier_type
         and identifier_hash = p_identifier_hash
         and window_start = v_window_start;
    end if;

    get diagnostics v_rowcount = row_count;
    if v_rowcount <> 1 then
      raise exception using errcode = 'P0001', message = 'RATE_LIMIT_INVALID';
    end if;
  end if;

  if v_locked_until is not null and v_locked_until > v_now then
    raise exception using errcode = 'P0001', message = 'AUTH_RATE_LIMITED';
  end if;

  return jsonb_build_object(
    'attempt_count', v_attempt_count,
    'locked_until', v_locked_until
  );
end;
$$;
