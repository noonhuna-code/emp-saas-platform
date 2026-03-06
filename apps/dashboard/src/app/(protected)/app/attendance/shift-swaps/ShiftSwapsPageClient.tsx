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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);
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
    setTemplateWarning(null);

    const [templateResult, mineResult] = await Promise.all([
      fetchShiftTemplates(),
      fetchShiftSwapRequests({ scope: "mine", limit: 50 })
    ]);

    if (!mineResult.ok || !mineResult.data) {
      setLoading(false);
      setError(mineResult.error ?? "Unable to load shift swap requests");
      return;
    }

    const templateRows = templateResult.ok && templateResult.data ? templateResult.data.rows : [];
    if (!templateResult.ok || !templateResult.data) {
      setTemplateWarning(templateResult.error ?? "Unable to load shift templates");
    }

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
    <div className="page-wrap space-y-8">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Shift Swap Requests</CardTitle>
          <p className="text-sm text-muted-foreground">
            Employees can request shift swaps. Team leads and HR can review queue items in this module.
          </p>
        </CardHeader>
      </Card>

      {loading ? <LoadingState label="Loading shift swap workspace..." /> : null}
      {!loading && error ? <ErrorState message={`${error}${error?.toLowerCase().includes("permission") ? " � Contact HR to confirm your attendance access and shift assignment." : ""}`} /> : null}

      {!loading && !error ? (
        <>
          {templateWarning ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {templateWarning}. You can still view your requests; submitting a new request needs available shift templates.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request shift swap</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-3" onSubmit={onCreate}>
                <label className="grid gap-1.5 text-sm">
                  Requested date
                  <input
                    type="date"
                    value={form.attendanceDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, attendanceDate: event.target.value }))}
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Target shift
                  <select
                    value={form.requestedShiftTemplateId}
                    onChange={(event) => setForm((prev) => ({ ...prev, requestedShiftTemplateId: event.target.value }))}
                    required
                    disabled={templates.length === 0}
                  >
                    {templates.length === 0 ? <option value="">No shifts available</option> : null}
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.start_time}-{template.end_time})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm">
                  Reason
                  <input
                    type="text"
                    value={form.reason}
                    onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                    placeholder="Reason for swap request"
                    required
                  />
                </label>
                <div className="flex flex-col justify-end gap-2 md:col-span-3">
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={submitting || templates.length === 0 || !form.requestedShiftTemplateId}
                  >
                    {submitting ? "Submitting..." : "Submit request"}
                  </button>
                  <span className="text-xs text-muted-foreground">{selectedTemplateName}</span>
                </div>
              </form>
              {message ? <p className="text-sm mt-3">{message}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My requests</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {canReview ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Review queue</CardTitle>
                  <span className="badge">Pending {reviewQueue.length}</span>
                </div>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default ShiftSwapsPageClient;
