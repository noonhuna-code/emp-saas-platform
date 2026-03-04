"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchShiftSwapRequests,
  fetchShiftTemplates,
  requestShiftSwap,
  reviewShiftSwap
} from "@/lib/client/api";
import type { ShiftSwapRequest } from "@/lib/types/attendance";
import type { ShiftTemplate } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

const tomorrowDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

const ShiftSwapsPageClient = () => {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [mine, setMine] = useState<ShiftSwapRequest[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ShiftSwapRequest[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    attendanceDate: tomorrowDate(),
    requestedShiftTemplateId: "",
    reason: ""
  });

  const selectedTemplateName = useMemo(() => {
    const selected = templates.find((template) => template.id === form.requestedShiftTemplateId);
    return selected ? `${selected.name} (${selected.start_time}-${selected.end_time})` : "Select shift";
  }, [templates, form.requestedShiftTemplateId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [templateResult, mineResult] = await Promise.all([
      fetchShiftTemplates(),
      fetchShiftSwapRequests({ scope: "mine", limit: 50 })
    ]);

    if (!templateResult.ok || !templateResult.data) {
      setLoading(false);
      setError(templateResult.error ?? "Unable to load shift templates");
      return;
    }
    if (!mineResult.ok || !mineResult.data) {
      setLoading(false);
      setError(mineResult.error ?? "Unable to load shift swap requests");
      return;
    }

    const templateRows = templateResult.data.rows;
    setTemplates(templateRows);
    setMine(mineResult.data.rows);
    setForm((prev) => ({
      ...prev,
      requestedShiftTemplateId: prev.requestedShiftTemplateId || templateRows[0]?.id || ""
    }));

    const reviewResult = await fetchShiftSwapRequests({ scope: "review", status: "pending", limit: 100 });
    if (reviewResult.ok && reviewResult.data) {
      setCanReview(true);
      setReviewQueue(reviewResult.data.rows);
    } else {
      setCanReview(false);
      setReviewQueue([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await requestShiftSwap({
      attendanceDate: form.attendanceDate,
      requestedShiftTemplateId: form.requestedShiftTemplateId,
      reason: form.reason
    });

    if (!result.ok) {
      setError(result.error ?? "Unable to submit shift swap request");
      setSubmitting(false);
      return;
    }

    setMessage("Shift swap request submitted.");
    setForm((prev) => ({ ...prev, reason: "" }));
    await loadData();
    setSubmitting(false);
  };

  const onReview = async (requestId: string, decision: "approved" | "rejected") => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const result = await reviewShiftSwap({ requestId, decision });
    if (!result.ok) {
      setError(result.error ?? "Unable to review shift swap");
      setSubmitting(false);
      return;
    }
    setMessage(`Shift swap ${decision}.`);
    await loadData();
    setSubmitting(false);
  };

  return (
    <div className="page-wrap stack">
      <section className="card stack">
        <h1 style={{ margin: 0 }}>Shift Swap Requests</h1>
        <p className="muted">
          Employees can request shift swaps. Team leads and HR can review queue items in this module.
        </p>
      </section>

      {loading ? <LoadingState label="Loading shift swap workspace..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <>
          <section className="card stack">
            <h3 style={{ margin: 0 }}>Request shift swap</h3>
            <form className="form-grid form-grid--three" onSubmit={onCreate}>
              <label>
                Requested date
                <input
                  type="date"
                  value={form.attendanceDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, attendanceDate: event.target.value }))}
                  required
                />
              </label>
              <label>
                Target shift
                <select
                  value={form.requestedShiftTemplateId}
                  onChange={(event) => setForm((prev) => ({ ...prev, requestedShiftTemplateId: event.target.value }))}
                  required
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.start_time}-{template.end_time})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reason
                <input
                  type="text"
                  value={form.reason}
                  onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                  placeholder="Reason for swap request"
                  required
                />
              </label>
              <div className="row" style={{ alignItems: "end" }}>
                <button type="submit" className="primary-btn" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit request"}
                </button>
                <span className="muted" style={{ fontSize: 12 }}>
                  {selectedTemplateName}
                </span>
              </div>
            </form>
            {message ? <p>{message}</p> : null}
          </section>

          <section className="card stack">
            <h3 style={{ margin: 0 }}>My requests</h3>
            {mine.length === 0 ? <EmptyState title="No shift swap requests" subtitle="Submit a request to swap your shift." compact /> : null}
            {mine.length > 0 ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Current Shift</th>
                      <th>Requested Shift</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mine.map((row) => (
                      <tr key={row.id}>
                        <td>{row.attendance_date}</td>
                        <td>{row.old_shift_name ?? row.old_shift_template_id}</td>
                        <td>{row.requested_shift_name ?? row.requested_shift_template_id}</td>
                        <td><span className="badge">{row.status}</span></td>
                        <td>{new Date(row.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          {canReview ? (
            <section className="card stack">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Review queue</h3>
                <span className="badge">Pending {reviewQueue.length}</span>
              </div>
              {reviewQueue.length === 0 ? <EmptyState title="No pending requests" subtitle="The review queue is clear." compact /> : null}
              {reviewQueue.length > 0 ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Date</th>
                        <th>Current Shift</th>
                        <th>Requested Shift</th>
                        <th>Reason</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewQueue.map((row) => (
                        <tr key={row.id}>
                          <td>{row.employee_name ?? row.employee_id}</td>
                          <td>{row.attendance_date}</td>
                          <td>{row.old_shift_name ?? row.old_shift_template_id}</td>
                          <td>{row.requested_shift_name ?? row.requested_shift_template_id}</td>
                          <td>{row.reason}</td>
                          <td>
                            <div className="row">
                              <button type="button" className="primary-btn" onClick={() => void onReview(row.id, "approved")} disabled={submitting}>
                                Approve
                              </button>
                              <button type="button" className="secondary-btn" onClick={() => void onReview(row.id, "rejected")} disabled={submitting}>
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default ShiftSwapsPageClient;



