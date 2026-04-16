import Link from "next/link";
import type { EmployeeDirectoryRow } from "@/lib/types/employees";
import { Avatar } from "@/components/shared/Avatar";

export const EmployeeTable = ({ rows }: { rows: EmployeeDirectoryRow[] }) => {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Manager</th>
            <th className="px-4 py-3">Job Level</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={row.full_name ?? row.employee_code ?? "Employee"} url={row.avatar_url} />
                  <div className="min-w-0 space-y-1">
                    <strong className="block truncate text-slate-950">{row.full_name ?? row.employee_code ?? "Employee"}</strong>
                    <span className="block truncate text-xs text-slate-500">{row.employee_code ?? row.id}</span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">{row.employment_status ?? "-"}</td>
              <td className="px-4 py-3">{row.department_id ?? "-"}</td>
              <td className="px-4 py-3">{row.team_id ?? "-"}</td>
              <td className="px-4 py-3">{row.manager_id ?? "-"}</td>
              <td className="px-4 py-3">{row.job_level ?? "-"}</td>
              <td className="px-4 py-3 text-right">
                <Link className="secondary-btn" href={`/app/employees/${row.id}`}>View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};
