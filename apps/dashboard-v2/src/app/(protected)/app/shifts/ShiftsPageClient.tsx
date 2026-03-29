"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchShiftAssignments, fetchShiftTemplates } from "@/lib/client/api";
import type { ShiftAssignment, ShiftTemplate } from "@/lib/types/workspace";
import { Tabs } from "@/components/shared/Tabs";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { PageContainer, PageHeader, StatCard, StatGrid, SurfacePanel } from "@/components/dashboard-v2/PagePrimitives";
import { ProfileTablePagination, ProfileTableShell, ProfileTableToolbar } from "@/components/profile/ProfileSectionPrimitives";

const TAB_ITEMS = [
  { id: "today", label: "Today" },
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
];

const PAGE_SIZE = 10;

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const todayText = () => new Date().toISOString().slice(0, 10);

const overlapsWindow = (assignment: ShiftAssignment, start: string, end: string) => {
  const effectiveTo = assignment.effective_to ?? "9999-12-31";
  return assignment.effective_from <= end && effectiveTo >= start;
};

export default function ShiftsPageClient() {
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("today");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentsResult, templatesResult] = await Promise.all([
        fetchShiftAssignments({ limit: 60 }),
        fetchShiftTemplates(),
      ]);

      if (!assignmentsResult.ok || !assignmentsResult.data) {
        setError(assignmentsResult.error ?? "Unable to load shift assignments");
        setAssignments([]);
      } else {
        setAssignments(assignmentsResult.data.rows ?? []);
      }

      if (!templatesResult.ok || !templatesResult.data) {
        setTemplates([]);
      } else {
        setTemplates(templatesResult.data.rows ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load shifts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const templateMap = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates]
  );

  const windowRange = useMemo(() => {
    const start = todayText();
    if (activeTab === "week") return { start, end: addDays(start, 6) };
    if (activeTab === "month") return { start, end: addDays(start, 29) };
    return { start, end: start };
  }, [activeTab]);

  const scopedAssignments = useMemo(() => {
    return assignments
      .filter((assignment) => overlapsWindow(assignment, windowRange.start, windowRange.end))
      .map((assignment) => {
        const template = templateMap.get(assignment.shift_template_id);
        return {
          ...assignment,
          shift_name: template?.name ?? "Shift",
          start_time: template?.start_time ?? "-",
          end_time: template?.end_time ?? "-",
        };
      });
  }, [assignments, templateMap, windowRange.end, windowRange.start]);

  const filteredAssignments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return scopedAssignments;
    return scopedAssignments.filter((assignment) =>
      [
        assignment.shift_name,
        assignment.start_time,
        assignment.end_time,
        assignment.effective_from,
        assignment.effective_to,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [query, scopedAssignments]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / PAGE_SIZE));
  const visibleAssignments = filteredAssignments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = useMemo(() => {
    return {
      total: scopedAssignments.length,
      current: scopedAssignments.filter((assignment) => assignment.effective_from <= todayText() && (assignment.effective_to ?? "9999-12-31") >= todayText()).length,
      range: `${windowRange.start} to ${windowRange.end}`,
    };
  }, [scopedAssignments, windowRange.end, windowRange.start]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Workday"
        title="Shifts"
        description="See your active shift coverage for today, the next 7 days, or the next 30 days."
      />

      {loading ? <LoadingState label="Loading shifts..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <>
          <StatGrid>
            <StatCard label="Assignments in view" value={summary.total} hint={summary.range} />
            <StatCard label="Active today" value={summary.current} hint="Assignments covering today" />
            <StatCard label="Templates" value={templates.length} hint="Real shift definitions" />
          </StatGrid>

          <SurfacePanel title="Shift windows" description="Use the shortest horizon you need without leaving the employee workspace.">
            <Tabs
              tabs={TAB_ITEMS}
              active={activeTab}
              onChange={(tab) => {
                setActiveTab(tab);
                setPage(1);
              }}
              noWrap
              variant="soft"
            />
          </SurfacePanel>

          <SurfacePanel title="Assigned shifts" description="Search your current schedule from one compact table.">
            <div className="space-y-4">
              <ProfileTableToolbar
                query={query}
                onQueryChange={(value) => {
                  setQuery(value);
                  setPage(1);
                }}
                placeholder="Search shift name, time, or effective date"
                countLabel={`${filteredAssignments.length} assignments`}
              />

              <ProfileTableShell>
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Shift</th>
                      <th className="px-4 py-3">Start</th>
                      <th className="px-4 py-3">End</th>
                      <th className="px-4 py-3">Effective from</th>
                      <th className="px-4 py-3">Effective to</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {visibleAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{assignment.shift_name}</td>
                        <td className="px-4 py-3">{assignment.start_time}</td>
                        <td className="px-4 py-3">{assignment.end_time}</td>
                        <td className="px-4 py-3">{assignment.effective_from}</td>
                        <td className="px-4 py-3">{assignment.effective_to ?? "Open-ended"}</td>
                      </tr>
                    ))}
                    {visibleAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                          No shifts found for this window.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </ProfileTableShell>

              <ProfileTablePagination
                page={page}
                totalPages={totalPages}
                countLabel={`Showing ${visibleAssignments.length} of ${filteredAssignments.length} assignments`}
                onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
              />
            </div>
          </SurfacePanel>
        </>
      ) : null}
    </PageContainer>
  );
}
