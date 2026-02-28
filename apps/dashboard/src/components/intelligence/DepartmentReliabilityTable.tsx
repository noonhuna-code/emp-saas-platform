import type { ReliabilityOverview } from "@/lib/types/intelligence";

type DepartmentRow = Record<string, unknown> & {
  department_id?: string | null;
  avg_reliability_score?: number | null;
  employee_count?: number | null;
  avg_attendance_percentage?: number | null;
  avg_late_frequency_percentage?: number | null;
};

export const DepartmentReliabilityTable = ({ overview }: { overview: ReliabilityOverview }) => {
  const departments = (overview.departments ?? []) as DepartmentRow[];

  return (
    <div className="card stack">
      <h3>Department Reliability Leaderboard</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Department</th>
            <th>Score</th>
            <th>Employees</th>
            <th>Attendance %</th>
            <th>Late %</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((row, index) => (
            <tr key={`${row.department_id ?? "dept"}-${index}`}>
              <td>{index + 1}</td>
              <td>{row.department_id ?? "-"}</td>
              <td>{row.avg_reliability_score ?? "-"}</td>
              <td>{row.employee_count ?? "-"}</td>
              <td>{row.avg_attendance_percentage ?? "-"}</td>
              <td>{row.avg_late_frequency_percentage ?? "-"}</td>
            </tr>
          ))}
          {departments.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">No department reliability data</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
};
