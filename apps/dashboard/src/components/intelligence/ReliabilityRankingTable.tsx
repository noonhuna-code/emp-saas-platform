import type { ReliabilityRankingRow } from "@/lib/types/intelligence";

export const ReliabilityRankingTable = ({ rows }: { rows: ReliabilityRankingRow[] }) => {
  return (
    <div className="card stack">
      <h3>Employee Reliability Ranking</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Employee</th>
            <th>Score</th>
            <th>Attendance %</th>
            <th>Late %</th>
            <th>Absence %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.employee_id}>
              <td>{row.company_rank}</td>
              <td>{row.employee_name ?? row.employee_id}</td>
              <td>{row.reliability_score}</td>
              <td>{row.attendance_percentage}</td>
              <td>{row.late_frequency_percentage}</td>
              <td>{row.absence_frequency_percentage}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">No ranking data</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
};
