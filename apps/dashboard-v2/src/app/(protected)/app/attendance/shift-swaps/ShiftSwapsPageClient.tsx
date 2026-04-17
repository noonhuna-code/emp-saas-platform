"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchShiftChangeCandidates,
  fetchShiftSwapRequests,
  fetchShiftTemplates,
  requestShiftSwap,
  reviewShiftSwap,
} from "@/lib/client/api";
import type { ShiftChangeCandidate, ShiftSwapRequest } from "@/lib/types/attendance";
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

const formatShiftLabel = (label?: string | null, start?: string | null, end?: string | null) => {
  if (label && start && end) return `${label} (${start}-${end})`;
  if (label) return label;
  if (start && end) return `${start}-${end}`;
  return "No shift";
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
  const [candidateWarning, setCandidateWarning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [requestMode, setRequestMode] = useState<"shift_change" | "swap_with_agent">("shift_change");
  const [candidates, setCandidates] = useState<ShiftChangeCandidate[]>([]);
  const [actorShift, setActorShift] = useState<{
    shiftTemplateId: string | null;
    shiftName: string | null;
    shiftStartTime: string | null;
    shiftEndTime: string | null;
  }>({
    shiftTemplateId: null,
    shiftName: null,
    shiftStartTime: null,
    shiftEndTime: null,
  });
  const [form, setForm] = useState({
    attendanceDate: tomorrowDate(),
    requestedShiftTemplateId: "",
    targetEmployeeId: "",
    reason: "",
  });

  const validTemplates = useMemo(
    () => templates.filter(isValidPtclSwapTemplate),
    [templates]
  );

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.employee_id === form.targetEmployeeId) ?? null,
    [candidates, form.targetEmployeeId]
  );

  const selectedTemplateName = useMemo(() => {
    const selected = validTemplates.find((template) => template.id === form.requestedShiftTemplateId);
    return selected ? `${selected.name} (${selected.start_time}-${selected.end_time})` : "Select shift";
  }, [validTemplates, form.requestedShiftTemplateId]);

  const actorShiftName = useMemo(
    () => formatShiftLabel(actorShift.shiftName, actorShift.shiftStartTime, actorShift.shiftEndTime),
    [actorShift]
  );

  const selectedAgentShiftName = useMemo(
    () => formatShiftLabel(selectedCandidate?.shift_name, selectedCandidate?.shift_start_time, selectedCandidate?.shift_end_time),
    [selectedCandidate]
  );

  const swapConflict = useMemo(() => {
    if (requestMode !== "swap_with_agent" || !selectedCandidate) return null;
    if (!selectedCandidate.shift_template_id) return "Selected agent has no active shift on that date.";
    if (selectedCandidate.shift_template_id === actorShift.shiftTemplateId) {
      return "Selected agent already has the same shift.";
    }
    return null;
  }, [actorShift.shiftTemplateId, requestMode, selectedCandidate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTemplateWarning(null);

    const [templateResult, mineResult, reviewResult] = await Promise.all([
      fetchShiftTemplates(),
      fetchShiftSwapRequests({ scope: "mine", limit: 50 }),
      fetchShiftSwapRequests({ scope: "review", limit: 100 }),
    ]);

    if (!mineResult.ok || !mineResult.data) {
      setLoading(false);
      setError(mineResult.error ?? "Unable to load shift change requests");
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

    if (reviewResult.ok && reviewResult.data) {
      setCanReview(true);
      setReviewQueue(reviewResult.data.rows.filter((row) => row.status === "pending_team_lead" || row.status === "pending_hr"));
    } else {
      setCanReview(false);
      setReviewQueue([]);
    }

    setLoading(false);
  }, []);

  const loadCandidates = useCallback(async () => {
    setCandidateWarning(null);

    const result = await fetchShiftChangeCandidates({
      attendanceDate: form.attendanceDate,
      query: candidateQuery || undefined,
      limit: 50,
    });

    if (!result.ok || !result.data) {
      setCandidates([]);
      setActorShift({
        shiftTemplateId: null,
        shiftName: null,
        shiftStartTime: null,
        shiftEndTime: null,
      });
      setCandidateWarning(result.error ?? "Unable to load available agents");
      return;
    }

    setCandidates(result.data.rows);
    setActorShift({
      shiftTemplateId: result.data.actorShiftTemplateId,
      shiftName: result.data.actorShiftName,
      shiftStartTime: result.data.actorShiftStartTime,
      shiftEndTime: result.data.actorShiftEndTime,
    });
  }, [candidateQuery, form.attendanceDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    if (requestMode !== "swap_with_agent") return;
    setForm((prev) => ({
      ...prev,
      requestedShiftTemplateId: selectedCandidate?.shift_template_id ?? prev.requestedShiftTemplateId,
    }));
  }, [requestMode, selectedCandidate]);

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await requestShiftSwap({
      attendanceDate: form.attendanceDate,
      requestedShiftTemplateId: form.requestedShiftTemplateId,
      reason: form.reason,
      requestMode,
      targetEmployeeId: requestMode === "swap_with_agent" ? form.targetEmployeeId : undefined,
    });

    if (!result.ok) {
      setError(result.error ?? "Unable to submit shift change request");
      setSubmitting(false);
      return;
    }

    setMessage(requestMode === "swap_with_agent" ? "Shift swap request submitted." : "Shift change request submitted.");
    setForm((prev) => ({ ...prev, reason: "", targetEmployeeId: "" }));
    await Promise.all([loadData(), loadCandidates()]);
    setSubmitting(false);
  };

  const onReview = async (requestId: string, decision: "approved" | "rejected") => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const result = await reviewShiftSwap({ requestId, decision });
    if (!result.ok) {
      setError(result.error ?? "Unable to review shift change");
      setSubmitting(false);
      return;
    }
    setMessage(
      result.data?.status === "pending_hr"
        ? "Request approved by team lead and sent to HR."
        : decision === "approved"
          ? "Shift change approved."
          : "Shift change rejected."
    );
    await loadData();
    setSubmitting(false);
  };

  const pendingMine = useMemo(
    () => mine.filter((row) => row.status === "pending_team_lead" || row.status === "pending_hr").length,
    [mine]
  );
  const pendingHrMine = useMemo(() => mine.filter((row) => row.status === "pending_hr").length, [mine]);
  const filteredMine = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return mine;
    return mine.filter((row) =>
      [
        row.attendance_date,
        row.old_shift_name,
        row.requested_shift_name,
        row.target_employee_name,
        row.reason,
        row.status_label,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [mine, query]);
  const filteredReview = useMemo(() => {
    const normalized = reviewQuery.trim().toLowerCase();
    if (!normalized) return reviewQueue;
    return reviewQueue.filter((row) =>
      [
        row.employee_name,
        row.attendance_date,
        row.old_shift_name,
        row.requested_shift_name,
        row.target_employee_name,
        row.reason,
        row.status_label,
      ]
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
        title="Shift change"
        description="Request direct shift changes or swap with another agent from one compact workflow."
        actions={
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <Badge className="rounded-full border-blue-200 bg-blue-50 text-blue-700">
              {validTemplates.length} live shift options
            </Badge>
            <Button variant="secondary" className="rounded-full" onClick={() => void Promise.all([loadData(), loadCandidates()])}>
              Refresh
            </Button>
          </div>
        }
      />

      {loading ? <LoadingState label="Loading shift change workspace..." /> : null}
      {!loading && error ? (
        <ErrorState
          message={
            error.toLowerCase().includes("permission")
              ? "You do not currently have shift change access. Contact HR or your team lead to confirm attendance scope."
              : error
          }
        />
      ) : null}

      {!loading && !error ? (
        <>
          <StatGrid>
            <StatCard label="My requests" value={mine.length} hint="All submitted change requests" />
            <StatCard label="Pending mine" value={pendingMine} hint="Waiting on review" />
            <StatCard label="With HR" value={pendingHrMine} hint="Salary-impact review queue" />
            <StatCard label="Review queue" value={reviewQueue.length} hint={canReview ? "Requests waiting on your stage" : "No review access in this session"} />
          </StatGrid>

          {templateWarning ? (
            <SurfacePanel title="Shift template warning" description="Review still works, but new submissions depend on live shift templates.">
              <p className="text-sm text-amber-600">{templateWarning}</p>
            </SurfacePanel>
          ) : null}

          <SurfacePanel title="Request shift change" description="Keep the first row focused on date, target shift, and reason, then choose whether to swap with another agent.">
            <form className="space-y-4" onSubmit={onCreate}>
              <div className="grid gap-4 xl:grid-cols-[180px_280px_minmax(0,1fr)_auto]">
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
                    disabled={requestMode === "swap_with_agent" || validTemplates.length === 0}
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
                    placeholder="Why do you need this shift update?"
                    required
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    className="w-full rounded-full px-5 xl:w-auto"
                    disabled={
                      submitting
                      || !form.requestedShiftTemplateId
                      || (requestMode === "swap_with_agent" && (!form.targetEmployeeId || Boolean(swapConflict)))
                    }
                  >
                    {submitting ? "Submitting..." : requestMode === "swap_with_agent" ? "Submit shift swap" : "Submit shift change"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 xl:grid-cols-[220px_220px_minmax(0,1fr)_auto]">
                <label className="grid gap-2 text-sm">
                  Request type
                  <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
                    <button
                      type="button"
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${requestMode === "shift_change" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
                      onClick={() => setRequestMode("shift_change")}
                    >
                      Shift change
                    </button>
                    <button
                      type="button"
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${requestMode === "swap_with_agent" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
                      onClick={() => setRequestMode("swap_with_agent")}
                    >
                      Swap with agent
                    </button>
                  </div>
                </label>

                <label className="grid gap-1.5 text-sm">
                  Agent search
                  <input
                    className={fieldClassName}
                    type="text"
                    value={candidateQuery}
                    onChange={(event) => setCandidateQuery(event.target.value)}
                    placeholder="Search teammate or department"
                  />
                </label>

                <label className="grid gap-1.5 text-sm">
                  Selected agent
                  <select
                    className={fieldClassName}
                    value={form.targetEmployeeId}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetEmployeeId: event.target.value }))}
                    disabled={requestMode !== "swap_with_agent"}
                  >
                    <option value="">{requestMode === "swap_with_agent" ? "Select another agent" : "Enable swap mode to select agent"}</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.employee_id} value={candidate.employee_id}>
                        {(candidate.full_name ?? "Employee")} - {candidate.shift_name ?? "No shift"}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-end">
                  <Button type="button" variant="secondary" className="w-full rounded-full xl:w-auto" onClick={() => void loadCandidates()}>
                    Refresh agents
                  </Button>
                </div>

                <div className="xl:col-span-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Your shift
                  </span>
                  <span className="text-sm text-slate-600">{actorShiftName}</span>
                  {requestMode === "swap_with_agent" ? (
                    <>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        Selected agent shift
                      </span>
                      <span className="text-sm text-slate-600">{selectedAgentShiftName}</span>
                    </>
                  ) : (
                    <>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        Target shift
                      </span>
                      <span className="text-sm text-slate-600">{selectedTemplateName}</span>
                    </>
                  )}
                </div>

                {swapConflict ? <p className="xl:col-span-4 text-sm text-rose-600">{swapConflict}</p> : null}
                {candidateWarning ? <p className="xl:col-span-4 text-sm text-amber-600">{candidateWarning}</p> : null}
              </div>

              {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
              {validTemplates.length !== templates.length ? (
                <p className="text-xs text-slate-500">
                  Only backend shift templates that are 8 hours and fall within the 9 AM to 9 PM PTCL operating window are shown here.
                </p>
              ) : null}
            </form>
          </SurfacePanel>

          <SurfacePanel title="Shift change history" description="Track request mode, approval stage, and target coverage without stretching the page.">
            {mine.length === 0 ? <EmptyState title="No shift change requests" subtitle="Submit a direct change or swap request to start the workflow." compact /> : null}
            {mine.length > 0 ? (
              <div className="space-y-4">
                <ProfileTableToolbar
                  query={query}
                  onQueryChange={(value) => {
                    setQuery(value);
                    setPage(1);
                  }}
                  placeholder="Search date, shift, agent, stage, or reason"
                  countLabel={`${filteredMine.length} requests`}
                />
                <ProfileTableShell>
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">Current shift</th>
                        <th className="px-4 py-3">Target shift</th>
                        <th className="px-4 py-3">Swap agent</th>
                        <th className="px-4 py-3">Stage</th>
                        <th className="px-4 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      {mineRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3">{row.attendance_date}</td>
                          <td className="px-4 py-3">{row.request_mode === "swap_with_agent" ? "Swap with agent" : "Shift change"}</td>
                          <td className="px-4 py-3">{row.old_shift_name ?? row.old_shift_template_id}</td>
                          <td className="px-4 py-3">{row.requested_shift_name ?? row.requested_shift_template_id}</td>
                          <td className="px-4 py-3 text-slate-500">{row.target_employee_name ?? "Direct request"}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">{row.status_label}</span>
                              <span className="text-xs text-slate-500">{row.current_stage_label}</span>
                            </div>
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
              description="Team leads send approved requests to HR, and HR finalizes the salary-impact stage."
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
                    placeholder="Search employee, date, shift, agent, or stage"
                    countLabel={`${filteredReview.length} requests`}
                  />
                  <ProfileTableShell>
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Mode</th>
                          <th className="px-4 py-3">Requested shift</th>
                          <th className="px-4 py-3">Next stage</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                        {reviewRows.map((row) => (
                          <tr key={row.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{row.employee_name ?? row.employee_id}</td>
                            <td className="px-4 py-3">{row.attendance_date}</td>
                            <td className="px-4 py-3">{row.request_mode === "swap_with_agent" ? "Swap with agent" : "Shift change"}</td>
                            <td className="px-4 py-3">{row.requested_shift_name ?? row.requested_shift_template_id}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-slate-900">{row.current_stage_label}</span>
                                <span className="text-xs text-slate-500">{row.next_approver_name ? `Next: ${row.next_approver_name}` : "Finalized at this stage"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  className="rounded-full px-4"
                                  onClick={() => void onReview(row.id, "approved")}
                                  disabled={submitting}
                                >
                                  {row.status === "pending_team_lead" ? "Send to HR" : "Approve"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="rounded-full px-4"
                                  onClick={() => void onReview(row.id, "rejected")}
                                  disabled={submitting}
                                >
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
