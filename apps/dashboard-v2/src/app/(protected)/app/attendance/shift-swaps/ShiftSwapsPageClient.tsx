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
import { ProfileTablePagination, ProfileTableShell, ProfileTableToolbar } from "@/components/profile/ProfileSectionPrimitives";

const fieldClassName =
  "h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

const tomorrowDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

const PAGE_SIZE = 8;

const parseMinutes = (value: string) => {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText ?? "0");
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const isValidPtclSwapTemplate = (template: ShiftTemplate) => {
  if (template.is_night_shift) return false;
  const start = parseMinutes(template.start_time);
  const end = parseMinutes(template.end_time);
  if (start === null || end === null || end <= start) return false;
  const duration = end - start;
  return duration === 8 * 60 && start >= 9 * 60 && end <= 21 * 60;
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
  const [query, setQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [form, setForm] = useState({
    attendanceDate: tomorrowDate(),
    requestedShiftTemplateId: "",
    reason: "",
  });

  const validTemplates = useMemo(
    () => templates.filter(isValidPtclSwapTemplate),
    [templates]
  );

  const selectedTemplateName = useMemo(() => {
    const selected = validTemplates.find((template) => template.id === form.requestedShiftTemplateId);
    return selected ? `${selected.name} (${selected.start_time}-${selected.end_time})` : "Select shift";
  }, [validTemplates, form.requestedShiftTemplateId]);

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
      requestedShiftTemplateId:
        prev.requestedShiftTemplateId && templateRows.some((template) => template.id === prev.requestedShiftTemplateId)
          ? prev.requestedShiftTemplateId
          : (templateRows.filter(isValidPtclSwapTemplate)[0]?.id ?? ""),
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
  const filteredMine = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return mine;
    return mine.filter((row) =>
      [row.attendance_date, row.old_shift_name, row.requested_shift_name, row.reason, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [mine, query]);
  const filteredReview = useMemo(() => {
    const normalized = reviewQuery.trim().toLowerCase();
    if (!normalized) return reviewQueue;
    return reviewQueue.filter((row) =>
      [row.employee_name, row.attendance_date, row.old_shift_name, row.requested_shift_name, row.reason, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [reviewQuery, reviewQueue]);
  const mineTotalPages = Math.max(1, Math.ceil(filteredMine.length / PAGE_SIZE));
  const reviewTotalPages = Math.max(1, Math.ceil(filteredReview.length / PAGE_SIZE));
  const mineRows = filteredMine.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const reviewRows = filteredReview.slice((reviewPage - 1) * PAGE_SIZE, reviewPage * PAGE_SIZE);

  return (
    <PageContainer>
        <PageHeader
          eyebrow="Leave & swaps"
          title="Shift swaps"
          description="Request, track, and review swaps from one compact register."
          actions={
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
              <Badge className="rounded-full border-blue-200 bg-blue-50 text-blue-700">
                {validTemplates.length} valid shift templates
              </Badge>
              <Button variant="secondary" className="rounded-full" onClick={() => void loadData()}>
                Refresh
              </Button>
            </div>
          }
        />

      {loading ? <LoadingState label="Loading shift swap workspace..." /> : null}
      {!loading && error ? (
        <ErrorState
          message={
            error.toLowerCase().includes("permission")
              ? "You do not currently have shift swap access. Contact HR or your lead to confirm attendance scope."
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

          <SurfacePanel title="Request shift swap" description="Keep the request form on one row and your target shift visible.">
            <form className="grid gap-4 xl:grid-cols-[180px_260px_minmax(0,1fr)_auto]" onSubmit={onCreate}>
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
                  disabled={validTemplates.length === 0}
                >
                  {validTemplates.length === 0 ? <option value="">No valid 8-hour shifts available</option> : null}
                  {validTemplates.map((template) => (
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
              <div className="flex items-end">
                <Button type="submit" className="w-full rounded-full px-5 xl:w-auto" disabled={submitting || validTemplates.length === 0 || !form.requestedShiftTemplateId}>
                  {submitting ? "Submitting..." : "Submit request"}
                </Button>
              </div>
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">Selected shift</span>
              <span className="text-sm text-slate-600">{selectedTemplateName}</span>
            </div>
            {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
            {validTemplates.length !== templates.length ? (
              <p className="mt-2 text-xs text-slate-500">
                Only backend shift templates that are 8 hours and fall within the PTCL 9 AM–9 PM window are shown here.
              </p>
            ) : null}
          </SurfacePanel>

          <SurfacePanel title="Shift swap history" description="Search your submitted requests without stretching the page.">
            {mine.length === 0 ? <EmptyState title="No shift swap requests" subtitle="Submit a request to swap your shift." compact /> : null}
            {mine.length > 0 ? (
              <div className="space-y-4">
                <ProfileTableToolbar
                  query={query}
                  onQueryChange={(value) => {
                    setQuery(value);
                    setPage(1);
                  }}
                  placeholder="Search date, shift, reason, or status"
                  countLabel={`${filteredMine.length} requests`}
                />
                <ProfileTableShell>
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Current shift</th>
                        <th className="px-4 py-3">Requested shift</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      {mineRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3">{row.attendance_date}</td>
                          <td className="px-4 py-3">{row.old_shift_name ?? row.old_shift_template_id}</td>
                          <td className="px-4 py-3">{row.requested_shift_name ?? row.requested_shift_template_id}</td>
                          <td className="px-4 py-3 text-slate-500">{row.reason}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">{row.status}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{new Date(row.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ProfileTableShell>
                <ProfileTablePagination
                  page={page}
                  totalPages={mineTotalPages}
                  countLabel={`Showing ${mineRows.length} of ${filteredMine.length} requests`}
                  onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                  onNext={() => setPage((value) => Math.min(mineTotalPages, value + 1))}
                />
              </div>
            ) : null}
          </SurfacePanel>

          {canReview ? (
            <SurfacePanel
              title="Review queue"
              description="Approve or reject only the requests currently waiting on your review."
              actions={<span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">Pending {reviewQueue.length}</span>}
            >
              {reviewQueue.length === 0 ? <EmptyState title="No pending requests" subtitle="The review queue is clear." compact /> : null}
              {reviewQueue.length > 0 ? (
                <div className="space-y-4">
                  <ProfileTableToolbar
                    query={reviewQuery}
                    onQueryChange={(value) => {
                      setReviewQuery(value);
                      setReviewPage(1);
                    }}
                    placeholder="Search employee, date, shift, or reason"
                    countLabel={`${filteredReview.length} requests`}
                  />
                  <ProfileTableShell>
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
                        {reviewRows.map((row) => (
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
                  </ProfileTableShell>
                  <ProfileTablePagination
                    page={reviewPage}
                    totalPages={reviewTotalPages}
                    countLabel={`Showing ${reviewRows.length} of ${filteredReview.length} review rows`}
                    onPrevious={() => setReviewPage((value) => Math.max(1, value - 1))}
                    onNext={() => setReviewPage((value) => Math.min(reviewTotalPages, value + 1))}
                  />
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
