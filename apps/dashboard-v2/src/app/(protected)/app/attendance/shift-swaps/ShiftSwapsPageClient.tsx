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
import {
  FeatureCallout,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  const pendingMine = useMemo(() => mine.filter((row) => row.status === "pending").length, [mine]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Shift swaps"
        title="Shift swap workspace"
        description="Request schedule exchanges, track your pending items, and review the queue when you manage team coverage."
        chips={["Employee requests", "Supervisor review", "Coverage aware"]}
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
          <FeatureCallout
            badge="Coverage"
            title="Handle swap requests without losing the review chain"
            description="Employees can request a swap, while team leads and HR review only the queue items they are meant to handle."
          />

          <StatGrid>
            <StatCard label="My requests" value={mine.length} hint="All submitted swap requests" />
            <StatCard label="Pending mine" value={pendingMine} hint="Still waiting on review" />
            <StatCard label="Review queue" value={reviewQueue.length} hint={canReview ? "Requests waiting on your team" : "No review access in this session"} />
            <StatCard label="Templates" value={templates.length} hint="Available shifts to request" />
          </StatGrid>

          {templateWarning ? (
            <SurfacePanel title="Shift template warning" description="You can still review or inspect requests even when the assignment templates are incomplete.">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {templateWarning}. You can still view your requests; submitting a new request needs available shift templates.
                </p>
            </SurfacePanel>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <SurfacePanel title="Request shift swap" description="Submit a swap request for a real shift template and add the reason reviewers need.">
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
            </SurfacePanel>

            <SurfacePanel title="My requests" description="Track the swaps you already requested and their current review state.">
              {mine.length === 0 ? <EmptyState title="No shift swap requests" subtitle="Submit a request to swap your shift." compact /> : null}
              {mine.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Current Shift</th>
                        <th className="px-4 py-3">Requested Shift</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
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
              ) : null}
            </SurfacePanel>
          </div>

          {canReview ? (
            <SurfacePanel
              title="Review queue"
              description="Approve or reject swap requests that are waiting on your team-level review."
              actions={<span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">Pending {reviewQueue.length}</span>}
            >
                {reviewQueue.length === 0 ? <EmptyState title="No pending requests" subtitle="The review queue is clear." compact /> : null}
                {reviewQueue.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Current Shift</th>
                          <th className="px-4 py-3">Requested Shift</th>
                          <th className="px-4 py-3">Reason</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {reviewQueue.map((row) => (
                          <tr key={row.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{row.employee_name ?? row.employee_id}</td>
                            <td className="px-4 py-3">{row.attendance_date}</td>
                            <td className="px-4 py-3">{row.old_shift_name ?? row.old_shift_template_id}</td>
                            <td className="px-4 py-3">{row.requested_shift_name ?? row.requested_shift_template_id}</td>
                            <td className="px-4 py-3 text-slate-500">{row.reason}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
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
            </SurfacePanel>
          ) : null}
        </>
      ) : null}
    </PageContainer>
  );
};

export default ShiftSwapsPageClient;
