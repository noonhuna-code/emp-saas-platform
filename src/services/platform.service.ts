import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
};

type SubscriptionRow = {
  id: string;
  company_id: string;
  plan_version_id: string;
  status: "trialing" | "active" | "past_due" | "canceled";
  current_period_start: string;
  current_period_end: string;
  updated_at: string;
  created_at: string;
};

type PlanVersionRow = {
  id: string;
  plan_id: string;
  version_no: number;
};

type PlanRow = {
  id: string;
  plan_code: string;
  display_name: string;
};

type SeatRow = {
  company_id: string;
  status: "active" | "pending" | "revoked";
  is_billable: boolean;
};

type InvoiceRow = {
  id: string;
  company_id: string;
  invoice_number: string;
  status: "draft" | "pending" | "under_review" | "paid" | "overdue" | "void";
  subtotal_minor: number;
  currency_snapshot: string;
  paid_at: string | null;
  due_date: string;
  created_at: string;
};

type AuditRow = {
  company_id: string | null;
  event_type: string;
  entity_type: string;
  created_at: string;
};

type PlatformPlanDistribution = {
  planCode: string;
  planName: string;
  companies: number;
};

type PlatformPaymentQueueItem = {
  companyId: string;
  companyName: string;
  invoiceId: string;
  invoiceNumber: string;
  status: "pending" | "under_review" | "overdue";
  dueDate: string;
  subtotalMinor: number;
  currencyCode: string;
  createdAt: string;
};

type PlatformCompanySummary = {
  companyId: string;
  companyName: string;
  slug: string;
  isActive: boolean;
  subscriptionId: string | null;
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled" | "none";
  planCode: string | null;
  planName: string | null;
  planVersion: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  activeSeats: number;
  billableSeats: number;
  latestInvoiceId: string | null;
  latestInvoiceNumber: string | null;
  latestInvoiceStatus: "draft" | "pending" | "under_review" | "paid" | "overdue" | "void" | null;
  latestInvoiceDueDate: string | null;
  lastPaymentAt: string | null;
  lastPaidAmountMinor: number | null;
  currencyCode: string | null;
};

type PlatformAuditEvent = {
  companyId: string | null;
  companyName: string | null;
  eventType: string;
  entityType: string;
  createdAt: string;
};

export type PlatformOverview = {
  generatedAt: string;
  kpis: {
    totalCompanies: number;
    activeCompanies: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    pastDueSubscriptions: number;
    pendingApprovals: number;
    overdueInvoices: number;
    activeBillableSeats: number;
    collectedLast30dMinor: number;
  };
  planDistribution: PlatformPlanDistribution[];
  paymentQueue: PlatformPaymentQueueItem[];
  companies: PlatformCompanySummary[];
  recentAudit: PlatformAuditEvent[];
};

const sanitizeError = (message: string | undefined, fallback: string): string => {
  if (!message) return fallback;
  const normalized = message.trim().toLowerCase();
  if (normalized.includes("jwt") || normalized.includes("auth")) return "Authentication required";
  if (normalized.includes("permission")) return "Permission denied";
  return fallback;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const getPlatformOverview = async (
  ctx: ServiceContext
): Promise<ServiceResult<PlatformOverview>> => {
  try {
    requirePermission("view_all_companies", ctx);

    const now = new Date();
    const paidWindowStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();

    const [companiesResult, subscriptionsResult, seatsResult, invoicesResult] = await Promise.all([
      ctx.supabase
        .from("companies")
        .select("id, name, slug, is_active, created_at")
        .is("is_deleted", false)
        .order("name", { ascending: true }),
      ctx.supabase
        .from("company_subscriptions")
        .select("id, company_id, plan_version_id, status, current_period_start, current_period_end, updated_at, created_at")
        .eq("is_current", true)
        .order("updated_at", { ascending: false }),
      ctx.supabase
        .from("company_seat_assignments")
        .select("company_id, status, is_billable")
        .eq("status", "active"),
      ctx.supabase
        .from("billing_invoices")
        .select("id, company_id, invoice_number, status, subtotal_minor, currency_snapshot, paid_at, due_date, created_at")
        .order("created_at", { ascending: false })
        .limit(20000)
    ]);

    if (companiesResult.error) {
      return { ok: false, error: sanitizeError(companiesResult.error.message, "Unable to load platform companies") };
    }
    if (subscriptionsResult.error) {
      return { ok: false, error: sanitizeError(subscriptionsResult.error.message, "Unable to load platform subscriptions") };
    }
    if (seatsResult.error) {
      return { ok: false, error: sanitizeError(seatsResult.error.message, "Unable to load platform seats") };
    }
    if (invoicesResult.error) {
      return { ok: false, error: sanitizeError(invoicesResult.error.message, "Unable to load platform invoices") };
    }

    const companies = (companiesResult.data ?? []) as CompanyRow[];
    const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[];
    const seatRows = (seatsResult.data ?? []) as SeatRow[];
    const invoices = (invoicesResult.data ?? []) as InvoiceRow[];

    const planVersionIds = Array.from(new Set(subscriptions.map((row) => row.plan_version_id).filter(Boolean)));

    const planVersionsResult = planVersionIds.length > 0
      ? await ctx.supabase
          .from("billing_plan_versions")
          .select("id, plan_id, version_no")
          .in("id", planVersionIds)
      : { data: [] as PlanVersionRow[], error: null };

    if (planVersionsResult.error) {
      return { ok: false, error: sanitizeError(planVersionsResult.error.message, "Unable to load plan versions") };
    }

    const planVersions = (planVersionsResult.data ?? []) as PlanVersionRow[];
    const planIds = Array.from(new Set(planVersions.map((row) => row.plan_id).filter(Boolean)));

    const plansResult = planIds.length > 0
      ? await ctx.supabase
          .from("billing_plans")
          .select("id, plan_code, display_name")
          .in("id", planIds)
      : { data: [] as PlanRow[], error: null };

    if (plansResult.error) {
      return { ok: false, error: sanitizeError(plansResult.error.message, "Unable to load plan catalog") };
    }

    const planVersionsById = new Map(planVersions.map((row) => [row.id, row]));
    const plansById = new Map(((plansResult.data ?? []) as PlanRow[]).map((row) => [row.id, row]));
    const companiesById = new Map(companies.map((row) => [row.id, row]));

    const subscriptionByCompany = new Map<string, SubscriptionRow>();
    for (const row of subscriptions) {
      if (!subscriptionByCompany.has(row.company_id)) {
        subscriptionByCompany.set(row.company_id, row);
      }
    }

    const seatStats = new Map<string, { active: number; billable: number }>();
    for (const seat of seatRows) {
      const bucket = seatStats.get(seat.company_id) ?? { active: 0, billable: 0 };
      bucket.active += 1;
      if (seat.is_billable) bucket.billable += 1;
      seatStats.set(seat.company_id, bucket);
    }

    const latestInvoiceByCompany = new Map<string, InvoiceRow>();
    let pendingApprovals = 0;
    let overdueInvoices = 0;
    let collectedLast30dMinor = 0;
    const paymentQueue: PlatformPaymentQueueItem[] = [];

    for (const invoice of invoices) {
      if (!latestInvoiceByCompany.has(invoice.company_id)) {
        latestInvoiceByCompany.set(invoice.company_id, invoice);
      }

      if (invoice.status === "under_review") pendingApprovals += 1;
      if (invoice.status === "overdue") overdueInvoices += 1;

      if (invoice.status === "paid" && invoice.paid_at && invoice.paid_at >= paidWindowStart) {
        collectedLast30dMinor += toNumber(invoice.subtotal_minor);
      }

      if ((invoice.status === "pending" || invoice.status === "under_review" || invoice.status === "overdue") && paymentQueue.length < 25) {
        const company = companiesById.get(invoice.company_id);
        paymentQueue.push({
          companyId: invoice.company_id,
          companyName: company?.name ?? "Unknown company",
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          status: invoice.status,
          dueDate: invoice.due_date,
          subtotalMinor: toNumber(invoice.subtotal_minor),
          currencyCode: invoice.currency_snapshot,
          createdAt: invoice.created_at
        });
      }
    }

    const planDistributionMap = new Map<string, PlatformPlanDistribution>();
    let activeSubscriptions = 0;
    let trialingSubscriptions = 0;
    let pastDueSubscriptions = 0;
    let activeBillableSeats = 0;

    const companiesSummary: PlatformCompanySummary[] = companies.map((company) => {
      const subscription = subscriptionByCompany.get(company.id) ?? null;
      const seatBucket = seatStats.get(company.id) ?? { active: 0, billable: 0 };
      activeBillableSeats += seatBucket.billable;

      if (subscription?.status === "active") activeSubscriptions += 1;
      if (subscription?.status === "trialing") trialingSubscriptions += 1;
      if (subscription?.status === "past_due") pastDueSubscriptions += 1;

      const planVersion = subscription ? planVersionsById.get(subscription.plan_version_id) ?? null : null;
      const plan = planVersion ? plansById.get(planVersion.plan_id) ?? null : null;

      if (plan) {
        const key = plan.plan_code;
        const bucket = planDistributionMap.get(key) ?? {
          planCode: plan.plan_code,
          planName: plan.display_name,
          companies: 0
        };
        bucket.companies += 1;
        planDistributionMap.set(key, bucket);
      }

      const latestInvoice = latestInvoiceByCompany.get(company.id) ?? null;

      return {
        companyId: company.id,
        companyName: company.name,
        slug: company.slug,
        isActive: company.is_active,
        subscriptionId: subscription?.id ?? null,
        subscriptionStatus: subscription?.status ?? "none",
        planCode: plan?.plan_code ?? null,
        planName: plan?.display_name ?? null,
        planVersion: planVersion?.version_no ?? null,
        currentPeriodStart: subscription?.current_period_start ?? null,
        currentPeriodEnd: subscription?.current_period_end ?? null,
        activeSeats: seatBucket.active,
        billableSeats: seatBucket.billable,
        latestInvoiceId: latestInvoice?.id ?? null,
        latestInvoiceNumber: latestInvoice?.invoice_number ?? null,
        latestInvoiceStatus: latestInvoice?.status ?? null,
        latestInvoiceDueDate: latestInvoice?.due_date ?? null,
        lastPaymentAt: latestInvoice?.paid_at ?? null,
        lastPaidAmountMinor: latestInvoice?.status === "paid" ? toNumber(latestInvoice.subtotal_minor) : null,
        currencyCode: latestInvoice?.currency_snapshot ?? null
      };
    });

    const recentAudit: PlatformAuditEvent[] = [];
    if (ctx.permissions.includes("view_global_audit")) {
      const auditResult = await ctx.supabase
        .from("billing_audit_events")
        .select("company_id, event_type, entity_type, created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!auditResult.error) {
        const auditRows = (auditResult.data ?? []) as AuditRow[];
        for (const row of auditRows) {
          recentAudit.push({
            companyId: row.company_id,
            companyName: row.company_id ? (companiesById.get(row.company_id)?.name ?? "Unknown company") : "Platform",
            eventType: row.event_type,
            entityType: row.entity_type,
            createdAt: row.created_at
          });
        }
      }
    }

    const planDistribution = Array.from(planDistributionMap.values()).sort((a, b) => b.companies - a.companies);
    companiesSummary.sort((a, b) => a.companyName.localeCompare(b.companyName));

    return {
      ok: true,
      data: {
        generatedAt: now.toISOString(),
        kpis: {
          totalCompanies: companies.length,
          activeCompanies: companies.filter((row) => row.is_active).length,
          activeSubscriptions,
          trialingSubscriptions,
          pastDueSubscriptions,
          pendingApprovals,
          overdueInvoices,
          activeBillableSeats,
          collectedLast30dMinor
        },
        planDistribution,
        paymentQueue,
        companies: companiesSummary,
        recentAudit
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load platform overview" };
  }
};
