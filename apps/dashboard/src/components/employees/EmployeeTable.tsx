import Link from "next/link";
import type { EmployeeDirectoryRow } from "@/lib/types/employees";
import { Avatar } from "@/components/shared/Avatar";

export const EmployeeTable = ({ rows }: { rows: EmployeeDirectoryRow[] }) => {
  return (
    <div className="card" style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Status</th>
            <th>Department</th>
            <th>Team</th>
            <th>Manager</th>
            <th>Job Level</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div className="row">
                  <Avatar name={row.full_name ?? row.employee_code ?? "Employee"} url={row.avatar_url} />
                  <div className="stack" style={{ gap: 4 }}>
                    <strong>{row.full_name ?? row.employee_code ?? "Employee"}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>{row.employee_code ?? row.id}</span>
                  </div>
                </div>
              </td>
              <td>{row.employment_status ?? "-"}</td>
              <td>{row.department_id ?? "-"}</td>
              <td>{row.team_id ?? "-"}</td>
              <td>{row.manager_id ?? "-"}</td>
              <td>{row.job_level ?? "-"}</td>
              <td>
                <Link className="secondary-btn" href={`/app/employees/${row.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
