export type PlatformPlanDistribution = {
  planCode: string;
  planName: string;
  companies: number;
};

export type PlatformPaymentQueueItem = {
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

export type PlatformCompanySummary = {
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

export type PlatformAuditEvent = {
  companyId: string | null;
  companyName: string | null;
  eventType: string;
  entityType: string;
  createdAt: string;
};

export type PlatformOverviewResponse = {
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
