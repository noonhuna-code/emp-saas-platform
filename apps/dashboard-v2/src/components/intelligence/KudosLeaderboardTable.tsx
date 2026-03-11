import type { KudosLeaderboardResponse } from "@/lib/types/intelligence";

export const KudosLeaderboardTable = ({ leaderboard }: { leaderboard: KudosLeaderboardResponse }) => {
  return (
    <div className="card stack">
      <h3>Monthly Kudos Leaderboards</h3>
      <div className="muted">Month: {leaderboard.month_bucket_utc ?? "-"}</div>

      <div className="stack">
        <h4>Top Employees</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Employee</th>
              <th>Points</th>
              <th>Kudos</th>
            </tr>
          </thead>
          <tbody>
            {(leaderboard.employees ?? []).map((row: any) => (
              <tr key={`${row.receiver_employee_id}-${row.company_rank}`}>
                <td>{row.company_rank ?? "-"}</td>
                <td>{row.receiver_name ?? row.receiver_employee_id}</td>
                <td>{row.total_points}</td>
                <td>{row.kudos_count}</td>
              </tr>
            ))}
            {(leaderboard.employees ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">No employee leaderboard data</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="stack">
        <h4>Top Departments</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Department</th>
              <th>Points</th>
              <th>Kudos</th>
            </tr>
          </thead>
          <tbody>
            {(leaderboard.departments ?? []).map((row: any) => (
              <tr key={`${row.department_id}-${row.department_rank}`}>
                <td>{row.department_rank ?? "-"}</td>
                <td>{row.department_id ?? "-"}</td>
                <td>{row.total_points}</td>
                <td>{row.kudos_count}</td>
              </tr>
            ))}
            {(leaderboard.departments ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">No department leaderboard data</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};
