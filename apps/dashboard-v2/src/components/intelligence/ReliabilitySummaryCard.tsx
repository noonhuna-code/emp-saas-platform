import type { ReliabilityOverview } from "@/lib/types/intelligence";

export const ReliabilitySummaryCard = ({ overview }: { overview: ReliabilityOverview }) => {
  const company = overview.company as Record<string, unknown> | null;
  const formatValue = (value: unknown) =>
    value === null || value === undefined ? "-" : String(value);

  return (
    <div className="card stack">
      <h3>Company Reliability (90-day)</h3>
      <div className="grid-two">
        <div>
          <div className="muted">Avg reliability</div>
          <div className="metric">{formatValue(company?.avg_reliability_score)}</div>
        </div>
        <div>
          <div className="muted">Employees</div>
          <div className="metric">{formatValue(company?.employee_count)}</div>
        </div>
        <div>
          <div className="muted">Attendance %</div>
          <div className="metric">{formatValue(company?.avg_attendance_percentage)}</div>
        </div>
        <div>
          <div className="muted">Late %</div>
          <div className="metric">{formatValue(company?.avg_late_frequency_percentage)}</div>
        </div>
      </div>
      <div className="muted">
        Window: {overview.window_start_date ?? "-"} to {overview.window_end_date ?? "-"}
      </div>
    </div>
  );
};
