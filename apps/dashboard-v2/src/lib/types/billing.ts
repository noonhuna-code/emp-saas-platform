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
  status: "trialing" | "active" | "past_due" | "canceled";
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
  status: "draft" | "pending" | "under_review" | "paid" | "overdue" | "void";
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
  subscription: {
    status: "trialing" | "active" | "past_due" | "canceled";
    planName: string;
    planCode: string;
    currentPeriodEnd: string;
  } | null;
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
