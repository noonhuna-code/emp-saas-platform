import type { ServiceContext, ServiceResult } from "../lib/types";
import { requireBillingCapability } from "../lib/billing-capabilities";

type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
type InvoiceStatus = "draft" | "pending" | "under_review" | "paid" | "overdue" | "void";

type BillingSubscriptionRow = {
  id: string;
  company_id: string;
  plan_id: string;
  plan_version_id: string;
  status: SubscriptionStatus;
  trial_starts_at?: string | null;
  trial_ends_at?: string | null;
  current_period_start: string;
  current_period_end: string;
  cancellation_requested_at?: string | null;
  seat_limit_override?: number | null;
  provider: string;
  created_at?: string | null;
};

type BillingPlanRow = {
  id: string;
  plan_code: string;
  display_name: string;
  tier_level: number;
  is_public: boolean;
  is_active: boolean;
};

type BillingPlanVersionRow = {
  id: string;
  plan_id: string;
  version_no: number;
  billing_interval: string;
  currency_code: string;
  trial_days: number;
  seat_pricing_model: string;
  is_active: boolean;
};

type BillingPlanEntitlementRow = {
  plan_version_id: string;
  feature_key: string;
  value_type: "boolean" | "limit_integer" | "limit_decimal" | "limit_text";
  bool_value?: boolean | null;
  int_value?: number | null;
  decimal_value?: number | null;
  text_value?: string | null;
};

type BillingEntitlementRow = {
  company_id: string;
  source_subscription_id?: string | null;
  entitlements_json?: Record<string, unknown> | null;
  resolved_at?: string | null;
};

type BillingInvoiceRow = {
  id: string;
  company_id: string;
  subscription_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  seat_count: number;
  subtotal_minor: number;
  tax_minor: number;
  total_minor: number;
  currency_code: string;
  status: InvoiceStatus;
  due_date: string;
  paid_at?: string | null;
  payment_reference?: string | null;
  payment_provider?: string | null;
  created_at: string;
  updated_at: string;
};

type BillingSeatAssignmentRow = {
  id: string;
  company_id: string;
  user_profile_id: string;
  subscription_id?: string | null;
  status: "active" | "pending" | "revoked";
  is_billable: boolean;
  assigned_at: string;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
};

type UserProfileLite = {
  id: string;
  full_name?: string | null;
};

type SeatMutationRpcResponse = {
  seat_assignment_id?: string;
  company_id?: string;
  user_profile_id?: string;
  status?: string;
  is_billable?: boolean;
};

type TrialBootstrapRpcResponse = {
  subscription_id?: string;
  status?: string;
  created?: boolean;
  trial_ends_at?: string | null;
};

type InvoiceGenerationRpcResponse = {
  invoice_id?: string;
  invoice_number?: string;
  status?: string;
  created?: boolean;
  seat_count?: number;
  subtotal_minor?: number;
  tax_minor?: number;
  total_minor?: number;
  due_date?: string;
};

type InvoiceTransitionRpcResponse = {
  invoice_id?: string;
  status?: string;
  changed?: boolean;
  subscription_id?: string;
  subscription_status?: string;
};

type WebhookProcessRpcResponse = {
  webhook_id?: string;
  process_status?: string;
  duplicate?: boolean;
  reason?: string;
  result?: Record<string, unknown>;
};

type PaymentProofSubmitRpcResponse = {
  proof_id?: string;
  invoice_id?: string;
  invoice_status?: string;
};

type OverdueSchedulerRpcResponse = {
  invoice_changed?: boolean;
  subscription_changed?: boolean;
  invoice_id?: string;
  subscription_id?: string;
  reason?: string;
};

type BillingPaymentProofRow = {
  id: string;
  company_id: string;
  invoice_id: string;
  submitted_by_profile_id: string;
  proof_storage_path: string;
  proof_content_hash: string;
  amount_minor: number;
  currency_code: string;
  reference_number?: string | null;
  payment_method: string;
  payment_date: string;
  notes?: string | null;
  supersedes_proof_id?: string | null;
  created_at: string;
};

export type BillingPlanCatalog = {
  planCode: string;
  displayName: string;
  tierLevel: number;
  version: number;
  billingInterval: string;
  currencyCode: string;
  trialDays: number;
  seatPricingModel: string;
  entitlements: Record<string, boolean | number | string>;
};

export type BillingSubscriptionSummary = {
  id: string;
  status: SubscriptionStatus;
  provider: string;
  planCode: string;
  planName: string;
  planVersion: number;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancellationRequestedAt: string | null;
  seatLimitOverride: number | null;
};

export type BillingSeatSummary = {
  activeTotal: number;
  activeBillable: number;
  seatLimit: number | null;
  seatsRemaining: number | null;
};

export type BillingInvoice = {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  seatCount: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  currencyCode: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt: string | null;
  paymentReference: string | null;
  paymentProvider: string | null;
  createdAt: string;
};

export type BillingSeatAssignment = {
  id: string;
  userProfileId: string;
  fullName: string | null;
  status: "active" | "pending" | "revoked";
  isBillable: boolean;
  assignedAt: string;
  endedAt: string | null;
};

export type BillingOverview = {
  subscription: BillingSubscriptionSummary | null;
  seatSummary: BillingSeatSummary;
  entitlements: Record<string, unknown>;
  resolvedAt: string | null;
  recentInvoices: BillingInvoice[];
};

export type BillingNavigationContext = {
  entitlements: Record<string, unknown>;
  resolvedAt: string | null;
  subscription: Pick<BillingSubscriptionSummary, "status" | "planName" | "planCode" | "currentPeriodEnd"> | null;
  seatSummary: BillingSeatSummary;
};

export type BillingInvoiceList = {
  rows: BillingInvoice[];
  page: number;
  pageSize: number;
  total: number;
};

export type BillingSeatAssignmentList = {
  rows: BillingSeatAssignment[];
};

export type BillingSeatMutationResult = {
  seatAssignmentId: string;
  userProfileId: string;
  status: string;
  isBillable: boolean;
};

export type BillingTrialBootstrapResult = {
  subscriptionId: string;
  status: string;
  created: boolean;
  trialEndsAt: string | null;
};

export type BillingInvoiceGenerationResult = {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  created: boolean;
  seatCount?: number;
  subtotalMinor?: number;
  taxMinor?: number;
  totalMinor?: number;
  dueDate?: string;
};

export type BillingInvoiceTransitionResult = {
  invoiceId: string;
  status: string;
  changed: boolean;
  subscriptionId?: string;
  subscriptionStatus?: string;
};

export type BillingWebhookProcessResult = {
  webhookId: string;
  processStatus: string;
  duplicate: boolean;
  reason?: string;
  result?: Record<string, unknown>;
};

export type BillingPaymentProof = {
  id: string;
  invoiceId: string;
  submittedByProfileId: string;
  proofStoragePath: string;
  proofContentHash: string;
  amountMinor: number;
  currencyCode: string;
  referenceNumber: string | null;
  paymentMethod: string;
  paymentDate: string;
  notes: string | null;
  supersedesProofId: string | null;
  createdAt: string;
};

export type BillingPaymentProofList = {
  rows: BillingPaymentProof[];
};

export type BillingPaymentProofSubmitResult = {
  proofId: string;
  invoiceId: string;
  invoiceStatus: string;
};

export type BillingOverdueSchedulerResult = {
  invoiceChanged: boolean;
  subscriptionChanged: boolean;
  invoiceId?: string;
  subscriptionId?: string;
  reason?: string;
};

export type BillingCancellationResult = {
  subscriptionId: string;
  status: string;
  changed: boolean;
  cancellationRequestedAt?: string | null;
  currentPeriodEnd?: string;
};

const sanitizeError = (message: string | undefined, fallback: string): string => {
  if (!message) return fallback;
  const normalized = message.trim();
  if (normalized === "UNAUTHENTICATED" || normalized.toLowerCase().includes("jwt")) return "Authentication required";
  if (normalized === "TENANT_MISMATCH") return "Permission denied";
  if (normalized === "PERMISSION_DENIED") return "Permission denied";
  if (normalized === "SEAT_LIMIT_EXCEEDED") return "Seat limit exceeded";
  if (normalized === "SEAT_ALREADY_ASSIGNED") return "Seat already assigned";
  if (normalized === "SEAT_NOT_ASSIGNED") return "Seat assignment not found";
  if (normalized === "USER_PROFILE_NOT_FOUND") return "User profile not found";
  if (normalized === "SUBSCRIPTION_NOT_FOUND") return "No active subscription found";
  if (normalized === "TRIAL_PLAN_NOT_CONFIGURED") return "Trial plan is not configured";
  if (normalized === "ACTOR_PROFILE_NOT_FOUND") return "Actor profile not found";
  if (normalized === "INVOICE_NOT_FOUND") return "Invoice not found";
  if (normalized === "INVOICE_ALREADY_PAID") return "Invoice already paid";
  if (normalized === "INVOICE_STATE_CONFLICT") return "Invoice state conflict";
  if (normalized === "PAYMENT_AMOUNT_MISMATCH") return "Payment amount does not match invoice subtotal";
  if (normalized === "PAYMENT_CURRENCY_MISMATCH") return "Payment currency does not match invoice currency";
  if (normalized === "PAYMENT_PROOF_REQUIRED") return "Payment proof is required";
  if (normalized === "PAYMENT_PROOF_NOT_FOUND") return "Payment proof not found";
  if (normalized === "INVALID_PAYMENT_AMOUNT") return "Invalid payment amount";
  if (normalized === "INVALID_PAYMENT_CURRENCY") return "Invalid payment currency";
  if (normalized === "INVALID_PAYMENT_METHOD") return "Invalid payment method";
  if (normalized === "INVALID_PAYMENT_REFERENCE") return "Payment reference is required";
  if (normalized === "INVALID_PROOF_HASH") return "Proof content hash is invalid";
  if (normalized === "APPROVAL_REASON_REQUIRED") return "Approval reason is required";
  if (normalized === "CANCELLATION_REQUESTED") return "Subscription cancellation has been requested";
  if (normalized === "INVOICE_WINDOW_NOT_OPEN") return "Invoice generation window is not open";
  if (normalized === "INVALID_DUE_DATE") return "Invalid due date";
  if (normalized === "SUBSCRIPTION_CANCELED") return "Subscription is canceled";
  if (normalized === "CURRENCY_IMMUTABLE") return "Subscription currency is immutable";
  if (normalized === "INVALID_PERIOD") return "Invalid invoice period";
  if (normalized === "INVALID_PAYMENT_PROVIDER") return "Invalid payment provider";
  if (normalized === "INVALID_WEBHOOK_PROVIDER") return "Invalid webhook provider";
  if (normalized === "INVALID_WEBHOOK_EVENT") return "Invalid webhook event";
  if (normalized === "WEBHOOK_PROCESSING_FAILED") return "Webhook processing failed";
  if (normalized === "WEBHOOK_PERSISTENCE_FAILED") return "Webhook persistence failed";
  if (normalized.toLowerCase().includes("permission")) return "Permission denied";
  return fallback;
};

const normalizePage = (value?: number): number => {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value as number));
};

const normalizePageSize = (value?: number, fallback = 20, max = 100): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value as number)));
};

const resolveEntitlementValue = (row: BillingPlanEntitlementRow): boolean | number | string => {
  if (row.value_type === "boolean") return Boolean(row.bool_value);
  if (row.value_type === "limit_integer") return Number(row.int_value ?? 0);
  if (row.value_type === "limit_decimal") return Number(row.decimal_value ?? 0);
  return row.text_value ?? "";
};

const extractSeatLimit = (entitlements: Record<string, unknown>): number | null => {
  const raw = entitlements["limit.active_seats"];
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  if (typeof raw === "string" && /^[0-9]+$/.test(raw)) return Number(raw);
  return null;
};

const mapInvoice = (row: BillingInvoiceRow): BillingInvoice => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  periodStart: row.period_start,
  periodEnd: row.period_end,
  seatCount: Number(row.seat_count ?? 0),
  subtotalMinor: Number(row.subtotal_minor ?? 0),
  taxMinor: Number(row.tax_minor ?? 0),
  totalMinor: Number(row.total_minor ?? 0),
  currencyCode: row.currency_code,
  status: row.status,
  dueDate: row.due_date,
  paidAt: row.paid_at ?? null,
  paymentReference: row.payment_reference ?? null,
  paymentProvider: row.payment_provider ?? null,
  createdAt: row.created_at
});

const mapPaymentProof = (row: BillingPaymentProofRow): BillingPaymentProof => ({
  id: row.id,
  invoiceId: row.invoice_id,
  submittedByProfileId: row.submitted_by_profile_id,
  proofStoragePath: row.proof_storage_path,
  amountMinor: Number(row.amount_minor ?? 0),
  currencyCode: row.currency_code,
  referenceNumber: row.reference_number ?? null,
  paymentMethod: row.payment_method,
  proofContentHash: row.proof_content_hash,
  paymentDate: row.payment_date,
  notes: row.notes ?? null,
  supersedesProofId: row.supersedes_proof_id ?? null,
  createdAt: row.created_at
});

const loadCurrentSubscription = async (ctx: ServiceContext): Promise<BillingSubscriptionRow | null> => {
  const { data, error } = await ctx.supabase
    .from("company_subscriptions")
    .select(
      "id, company_id, plan_id, plan_version_id, status, trial_starts_at, trial_ends_at, current_period_start, current_period_end, cancellation_requested_at, seat_limit_override, provider, created_at"
    )
    .eq("company_id", ctx.companyId)
    .eq("is_current", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as BillingSubscriptionRow | null) ?? null;
};

export const listBillingPlans = async (
  ctx: ServiceContext
): Promise<ServiceResult<{ plans: BillingPlanCatalog[] }>> => {
  try {
    requireBillingCapability(ctx, "view_billing");

    const { data: plans, error: plansError } = await ctx.supabase
      .from("billing_plans")
      .select("id, plan_code, display_name, tier_level, is_public, is_active")
      .eq("is_active", true)
      .order("tier_level", { ascending: true });

    if (plansError) {
      return { ok: false, error: sanitizeError(plansError.message, "Unable to load billing plans") };
    }

    const planRows = (plans ?? []) as BillingPlanRow[];
    if (planRows.length === 0) {
      return { ok: true, data: { plans: [] } };
    }

    const planIds = planRows.map((row) => row.id);
    const { data: versions, error: versionsError } = await ctx.supabase
      .from("billing_plan_versions")
      .select("id, plan_id, version_no, billing_interval, currency_code, trial_days, seat_pricing_model, is_active")
      .in("plan_id", planIds)
      .eq("is_active", true)
      .order("version_no", { ascending: false });

    if (versionsError) {
      return { ok: false, error: sanitizeError(versionsError.message, "Unable to load billing plans") };
    }

    const versionRows = (versions ?? []) as BillingPlanVersionRow[];
    const latestVersionByPlan = new Map<string, BillingPlanVersionRow>();
    for (const row of versionRows) {
      if (!latestVersionByPlan.has(row.plan_id)) {
        latestVersionByPlan.set(row.plan_id, row);
      }
    }

    const versionIds = Array.from(latestVersionByPlan.values()).map((row) => row.id);
    const entitlementRows: BillingPlanEntitlementRow[] = [];

    if (versionIds.length > 0) {
      const { data: entitlements, error: entitlementsError } = await ctx.supabase
        .from("billing_plan_entitlements")
        .select("plan_version_id, feature_key, value_type, bool_value, int_value, decimal_value, text_value")
        .in("plan_version_id", versionIds);

      if (entitlementsError) {
        return { ok: false, error: sanitizeError(entitlementsError.message, "Unable to load billing plans") };
      }

      entitlementRows.push(...((entitlements ?? []) as BillingPlanEntitlementRow[]));
    }

    const entitlementsByVersion = new Map<string, Record<string, boolean | number | string>>();
    for (const row of entitlementRows) {
      const current = entitlementsByVersion.get(row.plan_version_id) ?? {};
      current[row.feature_key] = resolveEntitlementValue(row);
      entitlementsByVersion.set(row.plan_version_id, current);
    }

    const mapped: BillingPlanCatalog[] = planRows
      .map((plan) => {
        const version = latestVersionByPlan.get(plan.id);
        if (!version) return null;
        return {
          planCode: plan.plan_code,
          displayName: plan.display_name,
          tierLevel: plan.tier_level,
          version: version.version_no,
          billingInterval: version.billing_interval,
          currencyCode: version.currency_code,
          trialDays: Number(version.trial_days ?? 0),
          seatPricingModel: version.seat_pricing_model,
          entitlements: entitlementsByVersion.get(version.id) ?? {}
        } satisfies BillingPlanCatalog;
      })
      .filter((row): row is BillingPlanCatalog => row !== null)
      .sort((a, b) => a.tierLevel - b.tierLevel);

    return { ok: true, data: { plans: mapped } };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to load billing plans") };
  }
};

export const getBillingOverview = async (
  ctx: ServiceContext
): Promise<ServiceResult<BillingOverview>> => {
  try {
    requireBillingCapability(ctx, "view_billing");

    const subscription = await loadCurrentSubscription(ctx);

    const { data: entitlement, error: entitlementError } = await ctx.supabase
      .from("company_entitlements")
      .select("company_id, source_subscription_id, entitlements_json, resolved_at")
      .eq("company_id", ctx.companyId)
      .maybeSingle();

    if (entitlementError) {
      return { ok: false, error: sanitizeError(entitlementError.message, "Unable to load billing overview") };
    }

    const entitlements = ((entitlement as BillingEntitlementRow | null)?.entitlements_json ?? {}) as Record<string, unknown>;
    const seatLimit = extractSeatLimit(entitlements);

    const [{ data: seatRows, error: seatError }, { data: invoices, error: invoiceError }] = await Promise.all([
      ctx.supabase
        .from("company_seat_assignments")
        .select("id, is_billable, status")
        .eq("company_id", ctx.companyId),
      ctx.supabase
        .from("billing_invoices")
        .select(
          "id, company_id, subscription_id, invoice_number, period_start, period_end, seat_count, subtotal_minor, tax_minor, total_minor, currency_code, status, due_date, paid_at, payment_reference, payment_provider, created_at, updated_at"
        )
        .eq("company_id", ctx.companyId)
        .order("created_at", { ascending: false })
        .limit(10)
    ]);

    if (seatError) {
      return { ok: false, error: sanitizeError(seatError.message, "Unable to load billing overview") };
    }
    if (invoiceError) {
      return { ok: false, error: sanitizeError(invoiceError.message, "Unable to load billing overview") };
    }

    const activeSeats = ((seatRows ?? []) as Array<{ status: string; is_billable: boolean }>).filter(
      (row) => row.status === "active"
    );
    const activeBillable = activeSeats.filter((row) => row.is_billable).length;
    const seatsRemaining = seatLimit === null ? null : Math.max(0, seatLimit - activeBillable);

    let subscriptionSummary: BillingSubscriptionSummary | null = null;
    if (subscription) {
      const [{ data: plan, error: planError }, { data: version, error: versionError }] = await Promise.all([
        ctx.supabase
          .from("billing_plans")
          .select("id, plan_code, display_name")
          .eq("id", subscription.plan_id)
          .eq("is_active", true)
          .maybeSingle(),
        ctx.supabase
          .from("billing_plan_versions")
          .select("id, version_no")
          .eq("id", subscription.plan_version_id)
          .eq("is_active", true)
          .maybeSingle()
      ]);

      if (planError || versionError) {
        return { ok: false, error: "Unable to load billing overview" };
      }

      subscriptionSummary = {
        id: subscription.id,
        status: subscription.status,
        provider: subscription.provider,
        planCode: ((plan as { plan_code?: string } | null)?.plan_code ?? "unknown"),
        planName: ((plan as { display_name?: string } | null)?.display_name ?? "Unknown"),
        planVersion: Number(((version as { version_no?: number } | null)?.version_no ?? 0)),
        trialStartsAt: subscription.trial_starts_at ?? null,
        trialEndsAt: subscription.trial_ends_at ?? null,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancellationRequestedAt: subscription.cancellation_requested_at ?? null,
        seatLimitOverride: subscription.seat_limit_override ?? null
      };
    }

    return {
      ok: true,
      data: {
        subscription: subscriptionSummary,
        seatSummary: {
          activeTotal: activeSeats.length,
          activeBillable,
          seatLimit,
          seatsRemaining
        },
        entitlements,
        resolvedAt: ((entitlement as BillingEntitlementRow | null)?.resolved_at ?? null) as string | null,
        recentInvoices: ((invoices ?? []) as BillingInvoiceRow[]).map(mapInvoice)
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to load billing overview") };
  }
};

export const getBillingNavigationContext = async (
  ctx: ServiceContext
): Promise<ServiceResult<BillingNavigationContext>> => {
  try {
    const subscription = await loadCurrentSubscription(ctx);

    const [{ data: entitlement, error: entitlementError }, { data: seatRows, error: seatError }] = await Promise.all([
      ctx.supabase
        .from("company_entitlements")
        .select("company_id, source_subscription_id, entitlements_json, resolved_at")
        .eq("company_id", ctx.companyId)
        .maybeSingle(),
      ctx.supabase
        .from("company_seat_assignments")
        .select("id, is_billable, status")
        .eq("company_id", ctx.companyId)
    ]);

    if (entitlementError) {
      return { ok: false, error: sanitizeError(entitlementError.message, "Unable to load entitlements") };
    }
    if (seatError) {
      return { ok: false, error: sanitizeError(seatError.message, "Unable to load seat summary") };
    }

    const entitlements = ((entitlement as BillingEntitlementRow | null)?.entitlements_json ?? {}) as Record<string, unknown>;
    const seatLimit = extractSeatLimit(entitlements);
    const activeSeats = ((seatRows ?? []) as Array<{ status: string; is_billable: boolean }>).filter((row) => row.status === "active");
    const activeBillable = activeSeats.filter((row) => row.is_billable).length;
    const seatsRemaining = seatLimit === null ? null : Math.max(0, seatLimit - activeBillable);

    let subscriptionSummary: BillingNavigationContext["subscription"] = null;
    if (subscription) {
      const { data: plan } = await ctx.supabase
        .from("billing_plans")
        .select("id, plan_code, display_name")
        .eq("id", subscription.plan_id)
        .eq("is_active", true)
        .maybeSingle();

      subscriptionSummary = {
        status: subscription.status,
        planName: (plan as { display_name?: string } | null)?.display_name ?? "Unknown",
        planCode: (plan as { plan_code?: string } | null)?.plan_code ?? "unknown",
        currentPeriodEnd: subscription.current_period_end
      };
    }

    return {
      ok: true,
      data: {
        entitlements,
        resolvedAt: ((entitlement as BillingEntitlementRow | null)?.resolved_at ?? null) as string | null,
        subscription: subscriptionSummary,
        seatSummary: {
          activeTotal: activeSeats.length,
          activeBillable,
          seatLimit,
          seatsRemaining
        }
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to load billing navigation context") };
  }
};

export const listBillingInvoices = async (
  ctx: ServiceContext,
  options: { page?: number; pageSize?: number; status?: InvoiceStatus } = {}
): Promise<ServiceResult<BillingInvoiceList>> => {
  try {
    requireBillingCapability(ctx, "view_billing");

    const page = normalizePage(options.page);
    const pageSize = normalizePageSize(options.pageSize, 20, 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = ctx.supabase
      .from("billing_invoices")
      .select(
        "id, company_id, subscription_id, invoice_number, period_start, period_end, seat_count, subtotal_minor, tax_minor, total_minor, currency_code, status, due_date, paid_at, payment_reference, payment_provider, created_at, updated_at",
        { count: "exact" }
      )
      .eq("company_id", ctx.companyId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error, count } = await query;
    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to load invoices") };
    }

    return {
      ok: true,
      data: {
        rows: ((data ?? []) as BillingInvoiceRow[]).map(mapInvoice),
        page,
        pageSize,
        total: count ?? 0
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to load invoices") };
  }
};

export const listCompanySeatAssignments = async (
  ctx: ServiceContext,
  options: { status?: "active" | "pending" | "revoked" } = {}
): Promise<ServiceResult<BillingSeatAssignmentList>> => {
  try {
    requireBillingCapability(ctx, "view_billing");

    let query = ctx.supabase
      .from("company_seat_assignments")
      .select("id, company_id, user_profile_id, subscription_id, status, is_billable, assigned_at, ended_at, created_at, updated_at")
      .eq("company_id", ctx.companyId)
      .order("assigned_at", { ascending: false });

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;
    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to load seat assignments") };
    }

    const rows = (data ?? []) as BillingSeatAssignmentRow[];
    const profileIds = Array.from(new Set(rows.map((row) => row.user_profile_id)));
    const nameByProfileId = new Map<string, string | null>();

    if (profileIds.length > 0) {
      const { data: profiles, error: profileError } = await ctx.supabase
        .from("user_profiles")
        .select("id, full_name")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .in("id", profileIds);

      if (profileError) {
        return { ok: false, error: sanitizeError(profileError.message, "Unable to load seat assignments") };
      }

      for (const row of (profiles ?? []) as UserProfileLite[]) {
        nameByProfileId.set(row.id, row.full_name ?? null);
      }
    }

    return {
      ok: true,
      data: {
        rows: rows.map((row) => ({
          id: row.id,
          userProfileId: row.user_profile_id,
          fullName: nameByProfileId.get(row.user_profile_id) ?? null,
          status: row.status,
          isBillable: row.is_billable,
          assignedAt: row.assigned_at,
          endedAt: row.ended_at ?? null
        }))
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to load seat assignments") };
  }
};

export const bootstrapCompanyTrialSubscription = async (
  ctx: ServiceContext
): Promise<ServiceResult<BillingTrialBootstrapResult>> => {
  try {
    requireBillingCapability(ctx, "manage_billing_subscription");

    const { data, error } = await ctx.supabase.rpc("ensure_company_trial_subscription", {
      p_company_id: ctx.companyId
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to bootstrap trial subscription") };
    }

    const payload = (data ?? {}) as TrialBootstrapRpcResponse;
    if (!payload.subscription_id || !payload.status) {
      return { ok: false, error: "Unable to bootstrap trial subscription" };
    }

    return {
      ok: true,
      data: {
        subscriptionId: payload.subscription_id,
        status: payload.status,
        created: Boolean(payload.created),
        trialEndsAt: payload.trial_ends_at ?? null
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to bootstrap trial subscription") };
  }
};

export const assignCompanySeat = async (
  ctx: ServiceContext,
  payload: { userProfileId: string; isBillable?: boolean }
): Promise<ServiceResult<BillingSeatMutationResult>> => {
  try {
    requireBillingCapability(ctx, "manage_billing_seats");

    const profileId = payload.userProfileId?.trim();
    if (!profileId) {
      return { ok: false, error: "User profile id is required" };
    }

    const { data, error } = await ctx.supabase.rpc("assign_company_seat_atomic", {
      p_company_id: ctx.companyId,
      p_user_profile_id: profileId,
      p_is_billable: payload.isBillable ?? true
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to assign seat") };
    }

    const row = (data ?? {}) as SeatMutationRpcResponse;
    if (!row.seat_assignment_id || !row.user_profile_id || !row.status) {
      return { ok: false, error: "Unable to assign seat" };
    }

    return {
      ok: true,
      data: {
        seatAssignmentId: row.seat_assignment_id,
        userProfileId: row.user_profile_id,
        status: row.status,
        isBillable: Boolean(row.is_billable)
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to assign seat") };
  }
};

export const revokeCompanySeat = async (
  ctx: ServiceContext,
  payload: { userProfileId: string }
): Promise<ServiceResult<BillingSeatMutationResult>> => {
  try {
    requireBillingCapability(ctx, "manage_billing_seats");

    const profileId = payload.userProfileId?.trim();
    if (!profileId) {
      return { ok: false, error: "User profile id is required" };
    }

    const { data, error } = await ctx.supabase.rpc("revoke_company_seat_atomic", {
      p_company_id: ctx.companyId,
      p_user_profile_id: profileId
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to revoke seat") };
    }

    const row = (data ?? {}) as SeatMutationRpcResponse;
    if (!row.seat_assignment_id || !row.user_profile_id || !row.status) {
      return { ok: false, error: "Unable to revoke seat" };
    }

    return {
      ok: true,
      data: {
        seatAssignmentId: row.seat_assignment_id,
        userProfileId: row.user_profile_id,
        status: row.status,
        isBillable: Boolean(row.is_billable)
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to revoke seat") };
  }
};

export const generateBillingInvoice = async (
  ctx: ServiceContext,
  payload: { periodStart?: string; periodEnd?: string; dueDate?: string } = {}
): Promise<ServiceResult<BillingInvoiceGenerationResult>> => {
  try {
    requireBillingCapability(ctx, "manage_billing_subscription");

    const { data, error } = await ctx.supabase.rpc("generate_billing_invoice_atomic", {
      p_company_id: ctx.companyId,
      p_period_start: payload.periodStart ?? null,
      p_period_end: payload.periodEnd ?? null,
      p_due_date: payload.dueDate ?? null
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to generate invoice") };
    }

    const row = (data ?? {}) as InvoiceGenerationRpcResponse;
    if (!row.invoice_id || !row.invoice_number || !row.status) {
      return { ok: false, error: "Unable to generate invoice" };
    }

    return {
      ok: true,
      data: {
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoice_number,
        status: row.status,
        created: Boolean(row.created),
        seatCount: typeof row.seat_count === "number" ? row.seat_count : undefined,
        subtotalMinor: typeof row.subtotal_minor === "number" ? row.subtotal_minor : undefined,
        taxMinor: typeof row.tax_minor === "number" ? row.tax_minor : undefined,
        totalMinor: typeof row.total_minor === "number" ? row.total_minor : undefined,
        dueDate: row.due_date
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to generate invoice") };
  }
};

export const markBillingInvoiceUnderReview = async (
  ctx: ServiceContext,
  invoiceId: string,
  payload: { paymentReference?: string; paymentProvider?: string } = {}
): Promise<ServiceResult<BillingInvoiceTransitionResult>> => {
  try {
    requireBillingCapability(ctx, "manage_billing_subscription");

    const id = invoiceId.trim();
    if (!id) {
      return { ok: false, error: "Invoice id is required" };
    }

    const { data, error } = await ctx.supabase.rpc("mark_billing_invoice_under_review_atomic", {
      p_company_id: ctx.companyId,
      p_invoice_id: id,
      p_payment_reference: payload.paymentReference?.trim() || null,
      p_payment_provider: payload.paymentProvider?.trim() || null
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to mark invoice under review") };
    }

    const row = (data ?? {}) as InvoiceTransitionRpcResponse;
    if (!row.invoice_id || !row.status) {
      return { ok: false, error: "Unable to mark invoice under review" };
    }

    return {
      ok: true,
      data: {
        invoiceId: row.invoice_id,
        status: row.status,
        changed: Boolean(row.changed),
        subscriptionId: row.subscription_id,
        subscriptionStatus: row.subscription_status
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to mark invoice under review") };
  }
};

export const markBillingInvoicePaid = async (
  ctx: ServiceContext,
  invoiceId: string,
  payload: {
    paidAmountMinor?: number;
    paidCurrencyCode?: string;
    paymentReference?: string;
    paymentProvider?: string;
    paidAt?: string;
    approvalReason?: string;
  } = {}
): Promise<ServiceResult<BillingInvoiceTransitionResult>> => {
  try {
    requireBillingCapability(ctx, "approve_billing_payments");

    const id = invoiceId.trim();
    if (!id) {
      return { ok: false, error: "Invoice id is required" };
    }
    if (!Number.isFinite(payload.paidAmountMinor)) {
      return { ok: false, error: "Paid amount (minor units) is required" };
    }
    if (!payload.paidCurrencyCode?.trim()) {
      return { ok: false, error: "Paid currency code is required" };
    }
    if (!payload.approvalReason?.trim()) {
      return { ok: false, error: "Approval reason is required" };
    }

    const { data, error } = await ctx.supabase.rpc("mark_billing_invoice_paid_atomic", {
      p_company_id: ctx.companyId,
      p_invoice_id: id,
      p_paid_amount_minor: Math.trunc(Number(payload.paidAmountMinor)),
      p_paid_currency_code: payload.paidCurrencyCode.trim().toUpperCase(),
      p_payment_reference: payload.paymentReference?.trim() || null,
      p_payment_provider: payload.paymentProvider?.trim() || null,
      p_paid_at: payload.paidAt ?? null,
      p_approval_reason: payload.approvalReason.trim()
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to mark invoice as paid") };
    }

    const row = (data ?? {}) as InvoiceTransitionRpcResponse;
    if (!row.invoice_id || !row.status) {
      return { ok: false, error: "Unable to mark invoice as paid" };
    }

    return {
      ok: true,
      data: {
        invoiceId: row.invoice_id,
        status: row.status,
        changed: Boolean(row.changed),
        subscriptionId: row.subscription_id,
        subscriptionStatus: row.subscription_status
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to mark invoice as paid") };
  }
};

export const processBillingWebhook = async (
  ctx: ServiceContext,
  payload: {
    provider: string;
    providerEventId: string;
    eventType: string;
    payloadJson?: Record<string, unknown>;
    payloadHash?: string;
  }
): Promise<ServiceResult<BillingWebhookProcessResult>> => {
  try {
    requireBillingCapability(ctx, "approve_billing_payments");

    const provider = payload.provider?.trim();
    const providerEventId = payload.providerEventId?.trim();
    const eventType = payload.eventType?.trim();
    if (!provider || !providerEventId || !eventType) {
      return { ok: false, error: "Provider, provider event id, and event type are required" };
    }

    const { data, error } = await ctx.supabase.rpc("process_billing_webhook_event_atomic", {
      p_company_id: ctx.companyId,
      p_provider: provider,
      p_provider_event_id: providerEventId,
      p_event_type: eventType,
      p_payload_json: payload.payloadJson ?? {},
      p_payload_hash: payload.payloadHash?.trim() || null
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to process webhook event") };
    }

    const row = (data ?? {}) as WebhookProcessRpcResponse;
    if (!row.webhook_id || !row.process_status) {
      return { ok: false, error: "Unable to process webhook event" };
    }

    return {
      ok: true,
      data: {
        webhookId: row.webhook_id,
        processStatus: row.process_status,
        duplicate: Boolean(row.duplicate),
        reason: row.reason,
        result: row.result
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to process webhook event") };
  }
};

export const submitBillingPaymentProof = async (
  ctx: ServiceContext,
  invoiceId: string,
  payload: {
    proofStoragePath: string;
    proofContentHash: string;
    amountMinor: number;
    currencyCode: string;
    referenceNumber: string;
    paymentMethod?: "bank_transfer" | "jazzcash" | "stripe" | "manual";
    paymentDate?: string;
    notes?: string;
    supersedesProofId?: string;
  }
): Promise<ServiceResult<BillingPaymentProofSubmitResult>> => {
  try {
    requireBillingCapability(ctx, "submit_billing_payment_proof");

    const id = invoiceId.trim();
    if (!id) {
      return { ok: false, error: "Invoice id is required" };
    }
    if (!payload.proofStoragePath?.trim()) {
      return { ok: false, error: "Payment proof is required" };
    }
    if (!payload.proofContentHash?.trim()) {
      return { ok: false, error: "Proof content hash is required" };
    }
    if (!Number.isFinite(payload.amountMinor) || payload.amountMinor <= 0) {
      return { ok: false, error: "Invalid payment amount" };
    }
    if (!payload.currencyCode?.trim()) {
      return { ok: false, error: "Invalid payment currency" };
    }
    if (!payload.referenceNumber?.trim()) {
      return { ok: false, error: "Payment reference is required" };
    }

    const { data, error } = await ctx.supabase.rpc("submit_billing_payment_proof_atomic", {
      p_company_id: ctx.companyId,
      p_invoice_id: id,
      p_proof_storage_path: payload.proofStoragePath.trim(),
      p_proof_content_hash: payload.proofContentHash.trim().toLowerCase(),
      p_amount_minor: Math.trunc(payload.amountMinor),
      p_currency_code: payload.currencyCode.trim().toUpperCase(),
      p_reference_number: payload.referenceNumber.trim(),
      p_payment_method: payload.paymentMethod ?? "bank_transfer",
      p_payment_date: payload.paymentDate ?? null,
      p_notes: payload.notes?.trim() || null,
      p_supersedes_proof_id: payload.supersedesProofId?.trim() || null
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to submit payment proof") };
    }

    const row = (data ?? {}) as PaymentProofSubmitRpcResponse;
    if (!row.proof_id || !row.invoice_id || !row.invoice_status) {
      return { ok: false, error: "Unable to submit payment proof" };
    }

    return {
      ok: true,
      data: {
        proofId: row.proof_id,
        invoiceId: row.invoice_id,
        invoiceStatus: row.invoice_status
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to submit payment proof") };
  }
};

export const listBillingPaymentProofs = async (
  ctx: ServiceContext,
  invoiceId: string
): Promise<ServiceResult<BillingPaymentProofList>> => {
  try {
    requireBillingCapability(ctx, "view_billing");

    const id = invoiceId.trim();
    if (!id) {
      return { ok: false, error: "Invoice id is required" };
    }

    const { data, error } = await ctx.supabase
      .from("billing_payment_proofs")
      .select(
        "id, company_id, invoice_id, submitted_by_profile_id, proof_storage_path, proof_content_hash, amount_minor, currency_code, reference_number, payment_method, payment_date, notes, supersedes_proof_id, created_at"
      )
      .eq("company_id", ctx.companyId)
      .eq("invoice_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to load payment proofs") };
    }

    return {
      ok: true,
      data: {
        rows: ((data ?? []) as BillingPaymentProofRow[]).map(mapPaymentProof)
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to load payment proofs") };
  }
};

export const runBillingOverdueScheduler = async (
  ctx: ServiceContext
): Promise<ServiceResult<BillingOverdueSchedulerResult>> => {
  try {
    requireBillingCapability(ctx, "manage_billing_subscription");

    const { data, error } = await ctx.supabase.rpc("run_billing_overdue_scheduler", {
      p_company_id: ctx.companyId
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to run billing scheduler") };
    }

    const row = (data ?? {}) as OverdueSchedulerRpcResponse;
    return {
      ok: true,
      data: {
        invoiceChanged: Boolean(row.invoice_changed),
        subscriptionChanged: Boolean(row.subscription_changed),
        invoiceId: row.invoice_id,
        subscriptionId: row.subscription_id,
        reason: row.reason
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to run billing scheduler") };
  }
};

export const requestBillingSubscriptionCancellation = async (
  ctx: ServiceContext,
  payload: { reason?: string } = {}
): Promise<ServiceResult<BillingCancellationResult>> => {
  try {
    requireBillingCapability(ctx, "manage_billing_subscription");

    const { data, error } = await ctx.supabase.rpc("request_billing_subscription_cancellation_atomic", {
      p_company_id: ctx.companyId,
      p_reason: payload.reason?.trim() || null
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to request cancellation") };
    }

    const row = (data ?? {}) as {
      subscription_id?: string;
      status?: string;
      changed?: boolean;
      cancellation_requested_at?: string | null;
      current_period_end?: string;
    };

    if (!row.subscription_id || !row.status) {
      return { ok: false, error: "Unable to request cancellation" };
    }

    return {
      ok: true,
      data: {
        subscriptionId: row.subscription_id,
        status: row.status,
        changed: Boolean(row.changed),
        cancellationRequestedAt: row.cancellation_requested_at ?? null,
        currentPeriodEnd: row.current_period_end
      }
    };
  } catch (err) {
    return { ok: false, error: sanitizeError(err instanceof Error ? err.message : undefined, "Unable to request cancellation") };
  }
};
