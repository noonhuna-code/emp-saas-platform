import type { TeamAttendanceRow } from "@/lib/types/attendance";

export const TeamAttendanceTable = ({ rows }: { rows: TeamAttendanceRow[] }) => {
  return (
    <div className="card stack">
      <h3>Team Attendance Today</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Status</th>
            <th>Clock-in</th>
            <th>Worked</th>
            <th>Overtime</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.employee_id}>
              <td>{row.employee_name ?? row.employee_id}</td>
              <td>{row.status ?? "-"}</td>
              <td>{row.check_in ?? "-"}</td>
              <td>{row.work_minutes ?? "-"}</td>
              <td>{row.overtime_minutes ?? "-"}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">No team attendance records</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
};
