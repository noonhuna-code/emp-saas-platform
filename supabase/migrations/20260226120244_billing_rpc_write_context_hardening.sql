-- ============================================
-- Migration: 20260226120244_billing_rpc_write_context_hardening.sql
-- Purpose : Block direct PostgREST table writes for billing; allow RPC mutation flow only
-- Scope   : Non-destructive + replay-safe
-- ============================================

create or replace function public.billing_request_is_rpc()
returns boolean
language sql
security invoker
set search_path = public
stable
as $$
  select coalesce(current_setting('request.path', true), '') like '/rest/v1/rpc/%';
$$;

drop policy if exists company_subscriptions_insert on public.company_subscriptions;
create policy company_subscriptions_insert on public.company_subscriptions
  for insert
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscriptions_update on public.company_subscriptions;
create policy company_subscriptions_update on public.company_subscriptions
  for update
  using (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscription_items_insert on public.company_subscription_items;
create policy company_subscription_items_insert on public.company_subscription_items
  for insert
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscription_items_update on public.company_subscription_items;
create policy company_subscription_items_update on public.company_subscription_items
  for update
  using (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_entitlements_insert on public.company_entitlements;
create policy company_entitlements_insert on public.company_entitlements
  for insert
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_entitlements_update on public.company_entitlements;
create policy company_entitlements_update on public.company_entitlements
  for update
  using (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_seat_assignments_insert on public.company_seat_assignments;
create policy company_seat_assignments_insert on public.company_seat_assignments
  for insert
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_seat_assignments_update on public.company_seat_assignments;
create policy company_seat_assignments_update on public.company_seat_assignments
  for update
  using (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_invoices_insert on public.billing_invoices;
create policy billing_invoices_insert on public.billing_invoices
  for insert
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_invoices_update on public.billing_invoices;
create policy billing_invoices_update on public.billing_invoices
  for update
  using (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_webhook_events_insert on public.billing_webhook_events;
create policy billing_webhook_events_insert on public.billing_webhook_events
  for insert
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_webhook_events_update on public.billing_webhook_events;
create policy billing_webhook_events_update on public.billing_webhook_events
  for update
  using (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscription_changes_insert on public.company_subscription_changes;
create policy company_subscription_changes_insert on public.company_subscription_changes
  for insert
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists company_subscription_changes_update on public.company_subscription_changes;
create policy company_subscription_changes_update on public.company_subscription_changes
  for update
  using (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  )
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_payment_proofs_insert on public.billing_payment_proofs;
create policy billing_payment_proofs_insert on public.billing_payment_proofs
  for insert
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('view_billing')
      or public.current_user_has_permission('manage_billing')
      or public.current_user_has_permission('manage_company')
    )
  );

drop policy if exists billing_payment_events_insert on public.billing_payment_events;
create policy billing_payment_events_insert on public.billing_payment_events
  for insert
  with check (
    public.billing_request_is_rpc()
    and company_id = public.current_user_company_id()
    and public.current_user_has_permission('approve_billing_payments')
  );

drop policy if exists billing_audit_events_insert on public.billing_audit_events;
create policy billing_audit_events_insert on public.billing_audit_events
  for insert
  with check (
    public.billing_request_is_rpc()
    and auth.uid() is not null
    and (
      company_id = public.current_user_company_id()
      or (
        company_id is null
        and (
          public.current_user_has_permission('manage_billing')
          or public.current_user_has_permission('manage_company')
        )
      )
    )
  );
