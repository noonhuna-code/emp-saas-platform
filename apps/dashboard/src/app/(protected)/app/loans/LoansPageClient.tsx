"use client";

import { useEffect, useState } from "react";
import {
  fetchMyFinancialObligationRequests,
  submitAdvanceRequest,
  submitLoanRequest
} from "@/lib/client/api";
import type { MyFinancialObligationRequest } from "@/lib/types/finance";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";

const DEFAULT_CURRENCY = "PKR";

const LoansPageClient = () => {
  const [rows, setRows] = useState<MyFinancialObligationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState({ amount: "", termMonths: "", reason: "" });
  const [advanceForm, setAdvanceForm] = useState({ amount: "", reason: "" });

  const load = async () => {
    setLoading(true);
    setError(null);
    const result = await fetchMyFinancialObligationRequests();
    if (!result.ok || !result.data) {
      setError(result.error ?? "Unable to load loans");
      setLoading(false);
      return;
    }
    setRows(result.data.requests);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmitLoan = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const amount = Number(loanForm.amount);
    const termMonths = Number(loanForm.termMonths);
    const result = await submitLoanRequest({
      amount,
      termMonths,
      currencyCode: DEFAULT_CURRENCY,
      reason: loanForm.reason || undefined
    });

    if (!result.ok) {
      setError(result.error ?? "Unable to submit loan request");
      return;
    }

    setMessage("Loan request submitted.");
    setLoanForm({ amount: "", termMonths: "", reason: "" });
    await load();
  };

  const onSubmitAdvance = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const amount = Number(advanceForm.amount);
    const result = await submitAdvanceRequest({
      amount,
      currencyCode: DEFAULT_CURRENCY,
      reason: advanceForm.reason || undefined
    });

    if (!result.ok) {
      setError(result.error ?? "Unable to submit advance request");
      return;
    }

    setMessage("Advance request submitted.");
    setAdvanceForm({ amount: "", reason: "" });
    await load();
  };

  return (
    <div className="page-wrap page-grid">
      <section className="card stack">
        <h1>Loans & Advances</h1>
        <p className="muted">Submit and track your financial obligation requests.</p>
      </section>

      {loading ? <LoadingState label="Loading financial obligations..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {message ? <section className="card"><p>{message}</p></section> : null}

      <section className="card stack">
        <h3>Request Loan</h3>
        <form className="form-grid form-grid--three" onSubmit={onSubmitLoan}>
          <label>
            Amount
            <input
              type="number"
              min="1"
              required
              value={loanForm.amount}
              onChange={(event) => setLoanForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
          </label>
          <label>
            Term (months)
            <input
              type="number"
              min="1"
              required
              value={loanForm.termMonths}
              onChange={(event) => setLoanForm((prev) => ({ ...prev, termMonths: event.target.value }))}
            />
          </label>
          <label>
            Reason
            <input
              type="text"
              value={loanForm.reason}
              onChange={(event) => setLoanForm((prev) => ({ ...prev, reason: event.target.value }))}
            />
          </label>
          <button type="submit" className="primary-btn">Submit loan request</button>
        </form>
      </section>

      <section className="card stack">
        <h3>Request Advance</h3>
        <form className="form-grid form-grid--three" onSubmit={onSubmitAdvance}>
          <label>
            Amount
            <input
              type="number"
              min="1"
              required
              value={advanceForm.amount}
              onChange={(event) => setAdvanceForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
          </label>
          <label>
            Reason
            <input
              type="text"
              value={advanceForm.reason}
              onChange={(event) => setAdvanceForm((prev) => ({ ...prev, reason: event.target.value }))}
            />
          </label>
          <div className="row" style={{ alignItems: "end" }}>
            <button type="submit" className="primary-btn">Submit advance request</button>
          </div>
        </form>
      </section>

      <section className="card stack">
        <h3>My Requests</h3>
        {rows.length === 0 ? <p className="muted">No requests found.</p> : null}
        {rows.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Created</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.obligationType}</td>
                  <td><span className="badge">{row.status}</span></td>
                  <td>{row.requestedAmount} {row.currencyCode}</td>
                  <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td>{row.reason ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  );
};

export default LoansPageClient;
