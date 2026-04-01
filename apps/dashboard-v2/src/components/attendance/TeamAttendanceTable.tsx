"use client";

import { useMemo, useState } from "react";
import type { TeamAttendanceRow } from "@/lib/types/attendance";
import { ProfileTablePagination, ProfileTableShell, ProfileTableToolbar } from "@/components/profile/ProfileSectionPrimitives";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 12;

const prettify = (value: string | null | undefined): string => {
  if (!value) return "-";
  switch (value) {
    case "go_active":
      return "GO Active";
    case "go_applied":
      return "GO Applied";
    case "leave_unpaid":
      return "Unpaid leave";
    case "leave_paid":
      return "Paid leave";
    case "off_day":
      return "Off day";
    default:
      return value.replace(/_/g, " ");
  }
};

const prettifyAttendanceStatus = (value: string | null | undefined): string => {
  if (!value) return "-";
  if (value === "pending") return "Clocked in";
  return prettify(value);
};

export const TeamAttendanceTable = ({
  rows,
  onAssignGo,
  assigningGoKey,
}: {
  rows: TeamAttendanceRow[];
  onAssignGo?: (row: TeamAttendanceRow) => void;
  assigningGoKey?: string | null;
}) => {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [
        row.employee_name,
        row.department_name,
        row.team_name,
        row.day_state,
        row.payroll_impact,
        row.leave_type_name,
        row.holiday_name,
        row.shift_name,
        row.status,
        row.late_login_request.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [query, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <ProfileTableToolbar
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder="Search employee, team, state, leave, or shift"
        countLabel={`${filteredRows.length} employee rows`}
      />

      <ProfileTableShell>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Day state</th>
              <th className="px-4 py-3">Payroll impact</th>
              <th className="px-4 py-3">Clock in</th>
              <th className="px-4 py-3">Late Login</th>
              <th className="px-4 py-3">Shift / context</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
            {pagedRows.map((row) => (
              <tr key={`${row.employee_id}:${row.attendance_date}`}>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{row.employee_name ?? row.employee_id}</p>
                    <p className="text-xs text-slate-500">{row.department_name ?? row.department_id ?? "No department"}</p>
                  </div>
                </td>
                <td className="px-4 py-3">{row.team_name ?? row.team_id ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {prettify(row.day_state)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{prettify(row.payroll_impact)}</td>
                <td className="px-4 py-3">{row.check_in ? new Date(row.check_in).toLocaleTimeString() : "-"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {row.late_login_request.exists ? prettify(row.late_login_request.status) : "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div>{row.leave_type_name ?? row.holiday_name ?? row.shift_name ?? "-"}</div>
                  <div className="text-xs text-slate-400">{prettifyAttendanceStatus(row.status)}</div>
                </td>
                <td className="px-4 py-3">
                  {onAssignGo && row.holiday_name && row.day_state !== "go_active" && row.day_state !== "go_applied" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      disabled={assigningGoKey === `${row.employee_id}:${row.attendance_date}`}
                      onClick={() => onAssignGo(row)}
                    >
                      {assigningGoKey === `${row.employee_id}:${row.attendance_date}` ? "Assigning..." : "Assign GO"}
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400">No action</span>
                  )}
                </td>
              </tr>
            ))}
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                  No employee day-state rows found for the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </ProfileTableShell>

      <ProfileTablePagination
        page={page}
        totalPages={totalPages}
        countLabel={`Showing ${pagedRows.length} of ${filteredRows.length} employees`}
        onPrevious={() => setPage((value) => Math.max(1, value - 1))}
        onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
      />
    </div>
  );
};
