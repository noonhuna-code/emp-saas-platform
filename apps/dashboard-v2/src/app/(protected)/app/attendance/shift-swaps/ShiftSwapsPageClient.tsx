"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchShiftSwapRequests,
  fetchShiftTemplates,
  requestShiftSwap,
  reviewShiftSwap,
} from "@/lib/client/api";
import type { ShiftSwapRequest } from "@/lib/types/attendance";
import type { ShiftTemplate } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fieldClassName =
  "h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

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
    reason: "",
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
      fetchShiftSwapRequests({ scope: "mine", limit: 50 }),
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
      requestedShiftTemplateId: prev.requestedShiftTemplateId || templateRows[0]?.id || "",
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
      reason: form.reason,
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

  const pendingMine = useMemo(() => mine.filter((row) => row.status === "pending").length, [mine]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Shift swaps"
        title="Shift swap workspace"
        description="Request a schedule exchange, track your queue, and review team coverage from one compact lane."
        actions={
          <>
            <Badge className="rounded-full border-blue-200 bg-blue-50 text-blue-700">
              {templates.length} shift templates
            </Badge>
            <Button variant="secondary" className="rounded-full" onClick={() => void loadData()}>
              Refresh
            </Button>
          </>
        }
      />

      {loading ? <LoadingState label="Loading shift swap workspace..." /> : null}
      {!loading && error ? (
        <ErrorState
          message={
            error.toLowerCase().includes("permission")
              ? "You do not currently have shift swap access. Contact HR/Admin to confirm attendance permissions and shift scope."
              : error
          }
        />
      ) : null}

      {!loading && !error ? (
        <>
          <StatGrid>
            <StatCard label="My requests" value={mine.length} hint="All submitted swap requests" />
            <StatCard label="Pending mine" value={pendingMine} hint="Still waiting on review" />
            <StatCard label="Review queue" value={reviewQueue.length} hint={canReview ? "Requests waiting on your team" : "No review access in this session"} />
            <StatCard label="Templates" value={templates.length} hint="Available shifts to request" />
          </StatGrid>

          {templateWarning ? (
            <SurfacePanel title="Shift template warning" description="Requests can still be reviewed, but new submissions need live templates.">
              <p className="text-sm text-amber-600">{templateWarning}</p>
            </SurfacePanel>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.9fr)]">
            <SurfacePanel title="Request shift swap" description="Submit a swap request against a live shift template.">
              <form className="grid gap-4 md:grid-cols-3" onSubmit={onCreate}>
                <label className="grid gap-1.5 text-sm">
                  Requested date
                  <input
                    className={fieldClassName}
                    type="date"
                    value={form.attendanceDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, attendanceDate: event.target.value }))}
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Target shift
                  <select
                    className={fieldClassName}
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
                    className={fieldClassName}
                    type="text"
                    value={form.reason}
                    onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                    placeholder="Short reason"
                    required
                  />
                </label>
                <div className="flex flex-col justify-end gap-2 md:col-span-3">
                  <Button type="submit" className="w-fit rounded-full px-5" disabled={submitting || templates.length === 0 || !form.requestedShiftTemplateId}>
                    {submitting ? "Submitting..." : "Submit request"}
                  </Button>
                  <span className="text-xs text-muted-foreground">{selectedTemplateName}</span>
                </div>
              </form>
              {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
            </SurfacePanel>

            <SurfacePanel title="My requests" description="Track the status of the swaps you already submitted.">
              {mine.length === 0 ? <EmptyState title="No shift swap requests" subtitle="Submit a request to swap your shift." compact /> : null}
              {mine.length > 0 ? (
                <div className="overflow-hidden rounded-[22px] border border-slate-200">
                  <div className="max-h-[360px] overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Current shift</th>
                          <th className="px-4 py-3">Requested shift</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                        {mine.map((row) => (
                          <tr key={row.id}>
                            <td className="px-4 py-3">{row.attendance_date}</td>
                            <td className="px-4 py-3">{row.old_shift_name ?? row.old_shift_template_id}</td>
                            <td className="px-4 py-3">{row.requested_shift_name ?? row.requested_shift_template_id}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">{row.status}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-500">{new Date(row.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </SurfacePanel>
          </div>

          {canReview ? (
            <SurfacePanel
              title="Review queue"
              description="Approve or reject only the requests that are currently waiting on your review."
              actions={<span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">Pending {reviewQueue.length}</span>}
            >
              {reviewQueue.length === 0 ? <EmptyState title="No pending requests" subtitle="The review queue is clear." compact /> : null}
              {reviewQueue.length > 0 ? (
                <div className="overflow-hidden rounded-[22px] border border-slate-200">
                  <div className="max-h-[360px] overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Current shift</th>
                          <th className="px-4 py-3">Requested shift</th>
                          <th className="px-4 py-3">Reason</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                        {reviewQueue.map((row) => (
                          <tr key={row.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{row.employee_name ?? row.employee_id}</td>
                            <td className="px-4 py-3">{row.attendance_date}</td>
                            <td className="px-4 py-3">{row.old_shift_name ?? row.old_shift_template_id}</td>
                            <td className="px-4 py-3">{row.requested_shift_name ?? row.requested_shift_template_id}</td>
                            <td className="px-4 py-3 text-slate-500">{row.reason}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" className="rounded-full px-4" onClick={() => void onReview(row.id, "approved")} disabled={submitting}>
                                  Approve
                                </Button>
                                <Button type="button" variant="secondary" className="rounded-full px-4" onClick={() => void onReview(row.id, "rejected")} disabled={submitting}>
                                  Reject
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </SurfacePanel>
          ) : null}
        </>
      ) : null}
    </PageContainer>
  );
};

export default ShiftSwapsPageClient;
