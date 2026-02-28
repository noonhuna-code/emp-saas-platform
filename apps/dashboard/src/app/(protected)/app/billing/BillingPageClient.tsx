"use client";

import { useEffect, useMemo, useState } from "react";
import {
  assignBillingSeat,
  bootstrapBillingTrial,
  fetchBillingInvoices,
  fetchBillingPaymentProofs,
  fetchBillingOverview,
  fetchBillingPlans,
  fetchBillingSeats,
  generateBillingInvoice,
  markBillingInvoicePaid,
  markBillingInvoiceUnderReview,
  runBillingOverdueScheduler,
  processBillingWebhook,
  requestBillingSubscriptionCancellation,
  submitBillingPaymentProof,
  revokeBillingSeat
} from "@/lib/client/api";
import type {
  BillingInvoiceList,
  BillingOverview,
  BillingPaymentProofList,
  BillingPlanCatalog,
  BillingSeatAssignmentList
} from "@/lib/types/billing";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);

const fmtDateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : "-");
const fmtDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : "-");

const toBadge = (status: string) => {
  if (status === "paid" || status === "active") return "badge badge--green";
  if (status === "overdue" || status === "past_due") return "badge badge--red";
  if (status === "draft" || status === "void") return "badge";
  if (status === "pending" || status === "under_review" || status === "trialing") return "badge badge--amber";
  return "badge";
};

type BillingAction =
  | "trial"
  | "assign"
  | "revoke"
  | "invoice"
  | "under_review"
  | "mark_paid"
  | "cancel"
  | "webhook"
  | "proof"
  | "scheduler";

export const BillingPageClient = ({ permissions }: { permissions: string[] }) => {
  const canViewBilling =
    permissions.includes("view_billing") || permissions.includes("manage_billing") || permissions.includes("manage_company");
  const canManageBilling = permissions.includes("manage_billing") || permissions.includes("manage_company");
  const canApproveBilling = canManageBilling && permissions.includes("approve_billing_payments");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [plans, setPlans] = useState<BillingPlanCatalog[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoiceList | null>(null);
  const [seats, setSeats] = useState<BillingSeatAssignmentList | null>(null);

  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceStatus, setInvoiceStatus] = useState<"" | "draft" | "pending" | "under_review" | "paid" | "overdue" | "void">("");
  const [seatStatus, setSeatStatus] = useState<"" | "active" | "pending" | "revoked">("");

  const [assignProfileId, setAssignProfileId] = useState("");
  const [assignBillable, setAssignBillable] = useState(true);
  const [revokeProfileId, setRevokeProfileId] = useState("");

  const [invoicePeriodStart, setInvoicePeriodStart] = useState("");
  const [invoicePeriodEnd, setInvoicePeriodEnd] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");

  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [paidAmountMinor, setPaidAmountMinor] = useState("");
  const [paidCurrencyCode, setPaidCurrencyCode] = useState("PKR");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProvider, setPaymentProvider] = useState<"" | "jazzcash" | "bank" | "stripe" | "manual">("manual");
  const [approvalReason, setApprovalReason] = useState("Verified payment proof and amount/currency match.");
  const [proofStoragePath, setProofStoragePath] = useState("");
  const [proofContentHash, setProofContentHash] = useState("");
  const [proofAmountMinor, setProofAmountMinor] = useState("");
  const [proofCurrencyCode, setProofCurrencyCode] = useState("PKR");
  const [proofReference, setProofReference] = useState("");
  const [proofMethod, setProofMethod] = useState<"bank_transfer" | "jazzcash" | "stripe" | "manual">("bank_transfer");
  const [proofPaymentDate, setProofPaymentDate] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [paymentProofs, setPaymentProofs] = useState<BillingPaymentProofList | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const [webhookProvider, setWebhookProvider] = useState("jazzcash");
  const [webhookEventId, setWebhookEventId] = useState("");
  const [webhookEventType, setWebhookEventType] = useState("payment_success");
  const [webhookPayload, setWebhookPayload] = useState("{}");

  const [busyAction, setBusyAction] = useState<BillingAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const totalInvoicePages = useMemo(() => {
    if (!invoices) return 1;
    return Math.max(1, Math.ceil(invoices.total / invoices.pageSize));
  }, [invoices]);

  const loadOverviewAndPlans = async () => {
    const [overviewResult, plansResult] = await Promise.all([fetchBillingOverview(), fetchBillingPlans()]);
    if (!overviewResult.ok || !overviewResult.data) {
      throw new Error(overviewResult.error ?? "Unable to load billing overview");
    }
    if (!plansResult.ok || !plansResult.data) {
      throw new Error(plansResult.error ?? "Unable to load billing plans");
    }
    setOverview(overviewResult.data);
    setPlans(plansResult.data.plans);
  };

  const loadInvoices = async (page: number, status: typeof invoiceStatus) => {
    const result = await fetchBillingInvoices({
      page,
      pageSize: 10,
      status: status || undefined
    });
    if (!result.ok || !result.data) {
      throw new Error(result.error ?? "Unable to load invoices");
    }
    setInvoices(result.data);
  };

  const loadSeats = async (status: typeof seatStatus) => {
    const result = await fetchBillingSeats(status || undefined);
    if (!result.ok || !result.data) {
      throw new Error(result.error ?? "Unable to load seats");
    }
    setSeats(result.data);
  };

  const loadProofs = async (invoiceId: string) => {
    if (!invoiceId.trim()) {
      setPaymentProofs(null);
      return;
    }
    const result = await fetchBillingPaymentProofs(invoiceId.trim());
    if (!result.ok || !result.data) {
      throw new Error(result.error ?? "Unable to load payment proofs");
    }
    setPaymentProofs(result.data);
  };

  const load = () => {
    if (!canViewBilling) {
      setLoading(false);
      setError("You do not have access to billing.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    void Promise.all([loadOverviewAndPlans(), loadInvoices(invoicePage, invoiceStatus), loadSeats(seatStatus)])
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load billing"))
      .finally(() => setLoading(false));
  };

  const loadAfterMutation = () => {
    void Promise.all([loadOverviewAndPlans(), loadInvoices(invoicePage, invoiceStatus), loadSeats(seatStatus)]).catch(
      (err: unknown) => setError(err instanceof Error ? err.message : "Unable to refresh billing data")
    );
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!canViewBilling) return;
    void loadInvoices(invoicePage, invoiceStatus).catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Unable to load invoices")
    );
  }, [invoicePage, invoiceStatus]);

  useEffect(() => {
    if (!canViewBilling) return;
    void loadSeats(seatStatus).catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Unable to load seats")
    );
  }, [seatStatus]);

  if (!canViewBilling) {
    return (
      <div className="page-wrap stack">
        <ErrorState message="You do not have access to billing." />
      </div>
    );
  }

  return (
    <div className="page-wrap stack">
      <div className="page-header">
        <div>
          <h1>Billing & Plans</h1>
          <p className="muted">Tenant-scoped subscription, invoices, entitlements, seats, and billing operations.</p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {canManageBilling ? (
            <button
              type="button"
              className="primary-btn"
              disabled={busyAction !== null}
              onClick={() => {
                setBusyAction("trial");
                setError(null);
                setNotice(null);
                void bootstrapBillingTrial()
                  .then((result) => {
                    if (!result.ok || !result.data) {
                      setError(result.error ?? "Unable to bootstrap trial");
                      return;
                    }
                    setNotice(
                      result.data.created
                        ? `Trial created. Ends ${fmtDate(result.data.trialEndsAt)}.`
                        : `Current trial is active until ${fmtDate(result.data.trialEndsAt)}.`
                    );
                    loadAfterMutation();
                  })
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to bootstrap trial"))
                  .finally(() => setBusyAction(null));
              }}
            >
              {busyAction === "trial" ? "Bootstrapping..." : "Bootstrap Trial"}
            </button>
          ) : null}
          {canManageBilling ? (
            <button
              type="button"
              className="secondary-btn"
              disabled={busyAction !== null}
              onClick={() => {
                setBusyAction("cancel");
                setError(null);
                setNotice(null);
                void requestBillingSubscriptionCancellation({
                  reason: cancellationReason || undefined
                })
                  .then((result) => {
                    if (!result.ok || !result.data) {
                      setError(result.error ?? "Unable to request cancellation");
                      return;
                    }
                    setNotice(
                      result.data.changed
                        ? "Cancellation requested. Subscription remains active until period end."
                        : "Cancellation was already requested."
                    );
                    loadAfterMutation();
                  })
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to request cancellation"))
                  .finally(() => setBusyAction(null));
              }}
            >
              {busyAction === "cancel" ? "Submitting..." : "Request Cancellation"}
            </button>
          ) : null}
          <button type="button" className="secondary-btn" disabled={loading || busyAction !== null} onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {notice ? (
        <section className="card">
          <p className="muted">{notice}</p>
        </section>
      ) : null}

      {loading ? <LoadingState label="Loading billing..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error && overview ? (
        <>
          <section className="grid-4">
            <article className="dashboard-kpi dashboard-kpi--info">
              <div className="dashboard-kpi__header">
                <span className="dashboard-kpi__label">Subscription</span>
                <span className={toBadge(overview.subscription?.status ?? "none")}>
                  {overview.subscription?.status ?? "none"}
                </span>
              </div>
              <div className="dashboard-kpi__value">{overview.subscription?.planName ?? "Not assigned"}</div>
              <div className="dashboard-kpi__hint">
                Period:{" "}
                {overview.subscription
                  ? `${fmtDate(overview.subscription.currentPeriodStart)} - ${fmtDate(overview.subscription.currentPeriodEnd)}`
                  : "-"}
              </div>
            </article>

            <article className="dashboard-kpi dashboard-kpi--success">
              <div className="dashboard-kpi__label">Active Seats</div>
              <div className="dashboard-kpi__value">{overview.seatSummary.activeBillable}</div>
              <div className="dashboard-kpi__hint">Total active: {overview.seatSummary.activeTotal}</div>
            </article>

            <article className="dashboard-kpi dashboard-kpi--warning">
              <div className="dashboard-kpi__label">Seat Limit</div>
              <div className="dashboard-kpi__value">
                {overview.seatSummary.seatLimit === null ? "Custom" : overview.seatSummary.seatLimit}
              </div>
              <div className="dashboard-kpi__hint">
                Remaining: {overview.seatSummary.seatsRemaining === null ? "Custom" : overview.seatSummary.seatsRemaining}
              </div>
            </article>

            <article className="dashboard-kpi dashboard-kpi--info">
              <div className="dashboard-kpi__label">Entitlements Sync</div>
              <div className="dashboard-kpi__value">{fmtDateTime(overview.resolvedAt)}</div>
              <div className="dashboard-kpi__hint">Snapshot-based runtime gating</div>
            </article>
          </section>

          {canManageBilling ? (
            <>
              <section className="card stack">
                <h2 style={{ margin: 0 }}>Cancellation Control</h2>
                <label>
                  <span className="muted">Cancellation Reason (optional)</span>
                  <input
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Reason for cancellation request"
                  />
                </label>
                <p className="muted">
                  Cancellation stops future invoice generation and auto-cancels when current period ends.
                </p>
              </section>

              <section className="grid-2">
                <article className="card stack">
                  <h2 style={{ margin: 0 }}>Invoice Generation Cycle</h2>
                  <div className="form-grid form-grid--three">
                    <label>
                      <span className="muted">Period Start (optional)</span>
                      <input type="date" value={invoicePeriodStart} onChange={(e) => setInvoicePeriodStart(e.target.value)} />
                    </label>
                    <label>
                      <span className="muted">Period End (optional)</span>
                      <input type="date" value={invoicePeriodEnd} onChange={(e) => setInvoicePeriodEnd(e.target.value)} />
                    </label>
                    <label>
                      <span className="muted">Due Date (optional)</span>
                      <input type="date" value={invoiceDueDate} onChange={(e) => setInvoiceDueDate(e.target.value)} />
                    </label>
                  </div>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={busyAction !== null}
                    onClick={() => {
                      setBusyAction("invoice");
                      setError(null);
                      setNotice(null);
                      void generateBillingInvoice({
                        periodStart: invoicePeriodStart || undefined,
                        periodEnd: invoicePeriodEnd || undefined,
                        dueDate: invoiceDueDate || undefined
                      })
                        .then((result) => {
                          if (!result.ok || !result.data) {
                            setError(result.error ?? "Unable to generate invoice");
                            return;
                          }
                          setNotice(
                            result.data.created
                              ? `Invoice ${result.data.invoiceNumber} generated.`
                              : `Existing invoice ${result.data.invoiceNumber} reused (idempotent).`
                          );
                          setSelectedInvoiceId(result.data.invoiceId);
                          setPaidAmountMinor(String(result.data.subtotalMinor ?? ""));
                          setPaidCurrencyCode("PKR");
                          setProofAmountMinor(String(result.data.subtotalMinor ?? ""));
                          setProofCurrencyCode("PKR");
                          void loadProofs(result.data.invoiceId).catch(() => undefined);
                          loadAfterMutation();
                        })
                        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to generate invoice"))
                        .finally(() => setBusyAction(null));
                    }}
                  >
                    {busyAction === "invoice" ? "Generating..." : "Generate Invoice"}
                  </button>
                </article>

                <article className="card stack">
                  <h2 style={{ margin: 0 }}>Invoice Transition</h2>
                  <div className="form-grid form-grid--two">
                    <label>
                      <span className="muted">Invoice ID</span>
                      <input
                        value={selectedInvoiceId}
                        onChange={(e) => setSelectedInvoiceId(e.target.value)}
                        placeholder="Select from invoice table or paste UUID"
                      />
                    </label>
                    <label>
                      <span className="muted">Payment Provider</span>
                      <select value={paymentProvider} onChange={(e) => setPaymentProvider(e.target.value as typeof paymentProvider)}>
                        <option value="">None</option>
                        <option value="manual">manual</option>
                        <option value="bank">bank</option>
                        <option value="jazzcash">jazzcash</option>
                        <option value="stripe">stripe</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    <span className="muted">Payment Reference (optional)</span>
                    <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
                  </label>
                  <div className="form-grid form-grid--two">
                    <label>
                      <span className="muted">Paid Amount (minor units)</span>
                      <input
                        value={paidAmountMinor}
                        onChange={(e) => setPaidAmountMinor(e.target.value)}
                        placeholder="e.g. 250000"
                      />
                    </label>
                    <label>
                      <span className="muted">Paid Currency</span>
                      <input
                        value={paidCurrencyCode}
                        onChange={(e) => setPaidCurrencyCode(e.target.value.toUpperCase())}
                        placeholder="PKR"
                        maxLength={3}
                      />
                    </label>
                  </div>
                  <label>
                    <span className="muted">Approval Reason (required)</span>
                    <input value={approvalReason} onChange={(e) => setApprovalReason(e.target.value)} />
                  </label>
                  <div className="row" style={{ flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={busyAction !== null || !selectedInvoiceId.trim()}
                      onClick={() => {
                        setBusyAction("under_review");
                        setError(null);
                        setNotice(null);
                        void markBillingInvoiceUnderReview(selectedInvoiceId.trim(), {
                          paymentReference: paymentReference || undefined,
                          paymentProvider: paymentProvider || undefined
                        })
                          .then((result) => {
                            if (!result.ok || !result.data) {
                              setError(result.error ?? "Unable to mark invoice under review");
                              return;
                            }
                            setNotice(
                              result.data.changed
                                ? "Invoice moved to under_review."
                                : "Invoice state unchanged (idempotent replay)."
                            );
                            loadAfterMutation();
                          })
                          .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to mark invoice under review"))
                          .finally(() => setBusyAction(null));
                      }}
                    >
                      {busyAction === "under_review" ? "Updating..." : "Move to Under Review"}
                    </button>
                    {canApproveBilling ? (
                      <button
                        type="button"
                        className="primary-btn"
                        disabled={
                          busyAction !== null ||
                          !selectedInvoiceId.trim() ||
                          !paidAmountMinor.trim() ||
                          !paidCurrencyCode.trim() ||
                          !approvalReason.trim()
                        }
                        onClick={() => {
                          setBusyAction("mark_paid");
                          setError(null);
                          setNotice(null);
                          void markBillingInvoicePaid(selectedInvoiceId.trim(), {
                            paidAmountMinor: Number(paidAmountMinor),
                            paidCurrencyCode: paidCurrencyCode.trim().toUpperCase(),
                            paymentReference: paymentReference || undefined,
                            paymentProvider: paymentProvider || undefined,
                            approvalReason: approvalReason.trim()
                          })
                            .then((result) => {
                              if (!result.ok || !result.data) {
                                setError(result.error ?? "Unable to approve payment");
                                return;
                              }
                              setNotice(
                                result.data.changed
                                  ? "Payment approved, invoice paid, and subscription extended."
                                  : "Invoice already paid (idempotent replay)."
                              );
                              loadAfterMutation();
                            })
                            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to approve payment"))
                            .finally(() => setBusyAction(null));
                        }}
                      >
                        {busyAction === "mark_paid" ? "Approving..." : "Approve Payment"}
                      </button>
                    ) : null}
                  </div>
                </article>
              </section>

              <section className="grid-2">
                <article className="card stack">
                  <h2 style={{ margin: 0 }}>Manual Payment Proof</h2>
                  <div className="form-grid form-grid--two">
                    <label>
                      <span className="muted">Invoice ID</span>
                      <input value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} />
                    </label>
                    <label>
                      <span className="muted">Proof Storage Path</span>
                      <input value={proofStoragePath} onChange={(e) => setProofStoragePath(e.target.value)} placeholder="billing-proofs/..." />
                    </label>
                    <label>
                      <span className="muted">Proof Content Hash (SHA-256)</span>
                      <input value={proofContentHash} onChange={(e) => setProofContentHash(e.target.value.toLowerCase())} />
                    </label>
                  </div>
                  <div className="form-grid form-grid--three">
                    <label>
                      <span className="muted">Amount (minor)</span>
                      <input value={proofAmountMinor} onChange={(e) => setProofAmountMinor(e.target.value)} />
                    </label>
                    <label>
                      <span className="muted">Currency</span>
                      <input value={proofCurrencyCode} onChange={(e) => setProofCurrencyCode(e.target.value.toUpperCase())} maxLength={3} />
                    </label>
                    <label>
                      <span className="muted">Method</span>
                      <select value={proofMethod} onChange={(e) => setProofMethod(e.target.value as typeof proofMethod)}>
                        <option value="bank_transfer">bank_transfer</option>
                        <option value="jazzcash">jazzcash</option>
                        <option value="manual">manual</option>
                        <option value="stripe">stripe</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-grid form-grid--two">
                    <label>
                      <span className="muted">Reference # (required)</span>
                      <input value={proofReference} onChange={(e) => setProofReference(e.target.value)} />
                    </label>
                    <label>
                      <span className="muted">Payment Date</span>
                      <input type="date" value={proofPaymentDate} onChange={(e) => setProofPaymentDate(e.target.value)} />
                    </label>
                  </div>
                  <label>
                    <span className="muted">Notes (optional)</span>
                    <textarea rows={2} value={proofNotes} onChange={(e) => setProofNotes(e.target.value)} />
                  </label>
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={busyAction !== null || !selectedInvoiceId.trim()}
                      onClick={() => {
                        setError(null);
                        void loadProofs(selectedInvoiceId.trim()).catch((err: unknown) =>
                          setError(err instanceof Error ? err.message : "Unable to load payment proofs")
                        );
                      }}
                    >
                      Refresh Proofs
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={
                      busyAction !== null ||
                      !selectedInvoiceId.trim() ||
                      !proofStoragePath.trim() ||
                      !proofContentHash.trim() ||
                      !proofAmountMinor.trim() ||
                      !proofCurrencyCode.trim() ||
                      !proofReference.trim()
                    }
                      onClick={() => {
                        setBusyAction("proof");
                        setError(null);
                        setNotice(null);
                        void submitBillingPaymentProof(selectedInvoiceId.trim(), {
                          proofStoragePath: proofStoragePath.trim(),
                          proofContentHash: proofContentHash.trim().toLowerCase(),
                          amountMinor: Number(proofAmountMinor),
                          currencyCode: proofCurrencyCode.trim().toUpperCase(),
                          referenceNumber: proofReference.trim(),
                          paymentMethod: proofMethod,
                          paymentDate: proofPaymentDate || undefined,
                          notes: proofNotes || undefined
                        })
                          .then((result) => {
                            if (!result.ok || !result.data) {
                              setError(result.error ?? "Unable to submit payment proof");
                              return;
                            }
                            setNotice("Payment proof submitted and invoice moved to under review.");
                            void loadProofs(selectedInvoiceId.trim()).catch(() => undefined);
                            loadAfterMutation();
                          })
                          .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to submit payment proof"))
                          .finally(() => setBusyAction(null));
                      }}
                    >
                      {busyAction === "proof" ? "Submitting..." : "Submit Proof"}
                    </button>
                  </div>
                </article>

                <article className="card stack">
                  <h2 style={{ margin: 0 }}>Billing Scheduler</h2>
                  <p className="muted">Runs overdue/past-due correction for the current tenant.</p>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={busyAction !== null}
                    onClick={() => {
                      setBusyAction("scheduler");
                      setError(null);
                      setNotice(null);
                      void runBillingOverdueScheduler()
                        .then((result) => {
                          if (!result.ok || !result.data) {
                            setError(result.error ?? "Unable to run billing scheduler");
                            return;
                          }
                          setNotice(
                            `Scheduler complete. Invoice changed: ${String(result.data.invoiceChanged)} | Subscription changed: ${String(
                              result.data.subscriptionChanged
                            )}.`
                          );
                          loadAfterMutation();
                        })
                        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to run billing scheduler"))
                        .finally(() => setBusyAction(null));
                    }}
                  >
                    {busyAction === "scheduler" ? "Running..." : "Run Overdue Scheduler"}
                  </button>
                </article>
              </section>

              <section className="card stack">
                <h2 style={{ margin: 0 }}>Webhook Processor (Idempotent)</h2>
                <div className="form-grid form-grid--three">
                  <label>
                    <span className="muted">Provider</span>
                    <input value={webhookProvider} onChange={(e) => setWebhookProvider(e.target.value)} />
                  </label>
                  <label>
                    <span className="muted">Provider Event ID</span>
                    <input value={webhookEventId} onChange={(e) => setWebhookEventId(e.target.value)} />
                  </label>
                  <label>
                    <span className="muted">Event Type</span>
                    <input value={webhookEventType} onChange={(e) => setWebhookEventType(e.target.value)} />
                  </label>
                </div>
                <label>
                  <span className="muted">Payload JSON</span>
                  <textarea
                    rows={4}
                    value={webhookPayload}
                    onChange={(e) => setWebhookPayload(e.target.value)}
                    placeholder='{"invoice_number":"INV-...","payment_reference":"abc"}'
                  />
                </label>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={
                    busyAction !== null ||
                    !canApproveBilling ||
                    !webhookProvider.trim() ||
                    !webhookEventId.trim() ||
                    !webhookEventType.trim()
                  }
                  onClick={() => {
                    let parsedPayload: Record<string, unknown>;
                    try {
                      parsedPayload = webhookPayload.trim() ? (JSON.parse(webhookPayload) as Record<string, unknown>) : {};
                    } catch {
                      setError("Invalid webhook payload JSON");
                      return;
                    }
                    setBusyAction("webhook");
                    setError(null);
                    setNotice(null);
                    void processBillingWebhook({
                      provider: webhookProvider.trim(),
                      providerEventId: webhookEventId.trim(),
                      eventType: webhookEventType.trim(),
                      payloadJson: parsedPayload
                    })
                      .then((result) => {
                        if (!result.ok || !result.data) {
                          setError(result.error ?? "Unable to process webhook event");
                          return;
                        }
                        setNotice(
                          result.data.duplicate
                            ? "Webhook replay detected and safely ignored as duplicate."
                            : `Webhook processed with status: ${result.data.processStatus}.`
                        );
                        loadAfterMutation();
                      })
                      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to process webhook event"))
                      .finally(() => setBusyAction(null));
                  }}
                >
                  {busyAction === "webhook" ? "Processing..." : "Process Webhook Event"}
                </button>
                {!canApproveBilling ? (
                  <p className="muted">Webhook processing requires `approve_billing_payments` capability.</p>
                ) : null}
              </section>
            </>
          ) : null}

          {!canManageBilling ? (
            <section className="card stack">
              <h2 style={{ margin: 0 }}>Manual Payment Proof</h2>
              <div className="form-grid form-grid--two">
                <label>
                  <span className="muted">Invoice ID</span>
                  <input value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} />
                </label>
                <label>
                  <span className="muted">Proof Storage Path</span>
                  <input value={proofStoragePath} onChange={(e) => setProofStoragePath(e.target.value)} placeholder="billing-proofs/..." />
                </label>
                <label>
                  <span className="muted">Proof Content Hash (SHA-256)</span>
                  <input value={proofContentHash} onChange={(e) => setProofContentHash(e.target.value.toLowerCase())} />
                </label>
              </div>
              <div className="form-grid form-grid--three">
                <label>
                  <span className="muted">Amount (minor)</span>
                  <input value={proofAmountMinor} onChange={(e) => setProofAmountMinor(e.target.value)} />
                </label>
                <label>
                  <span className="muted">Currency</span>
                  <input value={proofCurrencyCode} onChange={(e) => setProofCurrencyCode(e.target.value.toUpperCase())} maxLength={3} />
                </label>
                <label>
                  <span className="muted">Method</span>
                  <select value={proofMethod} onChange={(e) => setProofMethod(e.target.value as typeof proofMethod)}>
                    <option value="bank_transfer">bank_transfer</option>
                    <option value="jazzcash">jazzcash</option>
                    <option value="manual">manual</option>
                    <option value="stripe">stripe</option>
                  </select>
                </label>
              </div>
              <div className="form-grid form-grid--two">
                <label>
                  <span className="muted">Reference # (required)</span>
                  <input value={proofReference} onChange={(e) => setProofReference(e.target.value)} />
                </label>
                <label>
                  <span className="muted">Payment Date</span>
                  <input type="date" value={proofPaymentDate} onChange={(e) => setProofPaymentDate(e.target.value)} />
                </label>
              </div>
              <label>
                <span className="muted">Notes (optional)</span>
                <textarea rows={2} value={proofNotes} onChange={(e) => setProofNotes(e.target.value)} />
              </label>
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={busyAction !== null || !selectedInvoiceId.trim()}
                  onClick={() => {
                    setError(null);
                    void loadProofs(selectedInvoiceId.trim()).catch((err: unknown) =>
                      setError(err instanceof Error ? err.message : "Unable to load payment proofs")
                    );
                  }}
                >
                  Refresh Proofs
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={
                    busyAction !== null ||
                    !selectedInvoiceId.trim() ||
                    !proofStoragePath.trim() ||
                    !proofContentHash.trim() ||
                    !proofAmountMinor.trim() ||
                    !proofCurrencyCode.trim() ||
                    !proofReference.trim()
                  }
                  onClick={() => {
                    setBusyAction("proof");
                    setError(null);
                    setNotice(null);
                    void submitBillingPaymentProof(selectedInvoiceId.trim(), {
                      proofStoragePath: proofStoragePath.trim(),
                      proofContentHash: proofContentHash.trim().toLowerCase(),
                      amountMinor: Number(proofAmountMinor),
                      currencyCode: proofCurrencyCode.trim().toUpperCase(),
                      referenceNumber: proofReference.trim(),
                      paymentMethod: proofMethod,
                      paymentDate: proofPaymentDate || undefined,
                      notes: proofNotes || undefined
                    })
                      .then((result) => {
                        if (!result.ok || !result.data) {
                          setError(result.error ?? "Unable to submit payment proof");
                          return;
                        }
                        setNotice("Payment proof submitted and invoice moved to under review.");
                        void loadProofs(selectedInvoiceId.trim()).catch(() => undefined);
                        loadAfterMutation();
                      })
                      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to submit payment proof"))
                      .finally(() => setBusyAction(null));
                  }}
                >
                  {busyAction === "proof" ? "Submitting..." : "Submit Proof"}
                </button>
              </div>
            </section>
          ) : null}

          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>Current Entitlements</h2>
              <span className="muted">{Object.keys(overview.entitlements ?? {}).length} keys</span>
            </div>
            {Object.keys(overview.entitlements ?? {}).length === 0 ? (
              <EmptyState title="No entitlements resolved" subtitle="Bootstrap a subscription to resolve feature and limit keys." />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(overview.entitlements).map(([key, value]) => (
                      <tr key={key}>
                        <td><code>{key}</code></td>
                        <td>{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>Plan Catalog</h2>
              <span className="muted">{plans.length} plans</span>
            </div>
            {plans.length === 0 ? (
              <EmptyState title="No active plans" subtitle="Plan versions have not been configured yet." />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Tier</th>
                      <th>Version</th>
                      <th>Interval</th>
                      <th>Currency</th>
                      <th>Trial Days</th>
                      <th>Entitlements</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr key={`${plan.planCode}:${plan.version}`}>
                        <td>{plan.displayName} <span className="muted">({plan.planCode})</span></td>
                        <td>{plan.tierLevel}</td>
                        <td>{plan.version}</td>
                        <td>{plan.billingInterval}</td>
                        <td>{plan.currencyCode}</td>
                        <td>{plan.trialDays}</td>
                        <td>{Object.keys(plan.entitlements).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>Invoices</h2>
              <div className="row" style={{ gap: 8 }}>
                <label className="row">
                  <span className="muted">Status</span>
                  <select
                    value={invoiceStatus}
                    onChange={(event) => {
                      setInvoiceStatus(event.target.value as typeof invoiceStatus);
                      setInvoicePage(1);
                    }}
                  >
                    <option value="">All</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="void">Void</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                  disabled={invoicePage <= 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setInvoicePage((p) => Math.min(totalInvoicePages, p + 1))}
                  disabled={invoicePage >= totalInvoicePages}
                >
                  Next
                </button>
              </div>
            </div>

            {invoices && invoices.rows.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Period</th>
                      <th>Seats</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Due</th>
                      <th>Paid</th>
                      {canManageBilling ? <th>Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.invoiceNumber}</td>
                        <td>{fmtDate(row.periodStart)} - {fmtDate(row.periodEnd)}</td>
                        <td>{row.seatCount}</td>
                        <td>{money(row.totalMinor, row.currencyCode)}</td>
                        <td><span className={toBadge(row.status)}>{row.status}</span></td>
                        <td>{fmtDate(row.dueDate)}</td>
                        <td>{fmtDateTime(row.paidAt)}</td>
                        {canManageBilling ? (
                          <td>
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => {
                                setSelectedInvoiceId(row.id);
                                setPaidAmountMinor(String(row.subtotalMinor));
                                setPaidCurrencyCode(row.currencyCode);
                                setProofAmountMinor(String(row.subtotalMinor));
                                setProofCurrencyCode(row.currencyCode);
                                setProofReference("");
                                setProofContentHash("");
                                void loadProofs(row.id).catch(() => undefined);
                              }}
                            >
                              Select
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="muted" style={{ marginTop: 8 }}>
                  Page {invoices.page} of {totalInvoicePages} ({invoices.total} total)
                </p>
              </div>
            ) : (
              <EmptyState title="No invoices" subtitle="Invoice records for this tenant are not available yet." />
            )}
          </section>

          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>Payment Proof Timeline</h2>
              <span className="muted">{paymentProofs?.rows.length ?? 0} proofs</span>
            </div>
            {paymentProofs && paymentProofs.rows.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Created</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Currency</th>
                      <th>Reference</th>
                      <th>Storage Path</th>
                      <th>Content Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentProofs.rows.map((proof) => (
                      <tr key={proof.id}>
                        <td>{fmtDateTime(proof.createdAt)}</td>
                        <td>{proof.paymentMethod}</td>
                        <td>{proof.amountMinor}</td>
                        <td>{proof.currencyCode}</td>
                        <td>{proof.referenceNumber ?? "-"}</td>
                        <td><code>{proof.proofStoragePath}</code></td>
                        <td><code>{proof.proofContentHash}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No payment proofs" subtitle="Select an invoice and submit proof to start manual verification." />
            )}
          </section>

          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>Seat Assignments</h2>
              <label className="row">
                <span className="muted">Status</span>
                <select value={seatStatus} onChange={(event) => setSeatStatus(event.target.value as typeof seatStatus)}>
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="revoked">Revoked</option>
                </select>
              </label>
            </div>

            {canManageBilling ? (
              <div className="grid-2">
                <div className="card card--nested stack">
                  <h3 style={{ margin: 0 }}>Assign Seat</h3>
                  <label className="stack">
                    <span className="muted">User Profile ID</span>
                    <input
                      value={assignProfileId}
                      onChange={(event) => setAssignProfileId(event.target.value)}
                      placeholder="uuid..."
                    />
                  </label>
                  <label className="toggle">
                    <input type="checkbox" checked={assignBillable} onChange={(event) => setAssignBillable(event.target.checked)} />
                    Billable seat
                  </label>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={busyAction !== null || assignProfileId.trim().length === 0}
                    onClick={() => {
                      setBusyAction("assign");
                      setError(null);
                      setNotice(null);
                      void assignBillingSeat({
                        userProfileId: assignProfileId.trim(),
                        isBillable: assignBillable
                      })
                        .then((result) => {
                          if (!result.ok || !result.data) {
                            setError(result.error ?? "Unable to assign seat");
                            return;
                          }
                          setNotice(`Seat assigned to profile ${result.data.userProfileId}.`);
                          setAssignProfileId("");
                          loadAfterMutation();
                        })
                        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to assign seat"))
                        .finally(() => setBusyAction(null));
                    }}
                  >
                    {busyAction === "assign" ? "Assigning..." : "Assign Seat"}
                  </button>
                </div>

                <div className="card card--nested stack">
                  <h3 style={{ margin: 0 }}>Revoke Seat</h3>
                  <label className="stack">
                    <span className="muted">User Profile ID</span>
                    <input
                      value={revokeProfileId}
                      onChange={(event) => setRevokeProfileId(event.target.value)}
                      placeholder="uuid..."
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={busyAction !== null || revokeProfileId.trim().length === 0}
                    onClick={() => {
                      setBusyAction("revoke");
                      setError(null);
                      setNotice(null);
                      void revokeBillingSeat({ userProfileId: revokeProfileId.trim() })
                        .then((result) => {
                          if (!result.ok || !result.data) {
                            setError(result.error ?? "Unable to revoke seat");
                            return;
                          }
                          setNotice(`Seat revoked for profile ${result.data.userProfileId}.`);
                          setRevokeProfileId("");
                          loadAfterMutation();
                        })
                        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to revoke seat"))
                        .finally(() => setBusyAction(null));
                    }}
                  >
                    {busyAction === "revoke" ? "Revoking..." : "Revoke Seat"}
                  </button>
                </div>
              </div>
            ) : null}

            {seats && seats.rows.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Profile</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Billable</th>
                      <th>Assigned</th>
                      <th>Ended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seats.rows.map((row) => (
                      <tr key={row.id}>
                        <td><code>{row.userProfileId}</code></td>
                        <td>{row.fullName ?? "-"}</td>
                        <td><span className={toBadge(row.status)}>{row.status}</span></td>
                        <td>{row.isBillable ? "Yes" : "No"}</td>
                        <td>{fmtDateTime(row.assignedAt)}</td>
                        <td>{fmtDateTime(row.endedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No seat assignments" subtitle="No tenant seat assignments match the current filter." />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
};
