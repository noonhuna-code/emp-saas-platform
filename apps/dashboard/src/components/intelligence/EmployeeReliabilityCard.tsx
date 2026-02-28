import type { EmployeeReliabilityCard as EmployeeReliabilityCardType } from "@/lib/types/intelligence";

export const EmployeeReliabilityCard = ({ card }: { card: EmployeeReliabilityCardType | null }) => {
  if (!card) {
    return (
      <div className="card stack">
        <h3>Your Reliability</h3>
        <p className="muted" style={{ margin: 0 }}>
          No reliability score available for the current window.
        </p>
      </div>
    );
  }

  const formatValue = (value: unknown) =>
    value === null || value === undefined ? "-" : String(value);

  return (
    <div className="card stack">
      <h3>Your Reliability</h3>
      <div className="grid-two">
        <div>
          <div className="muted">Score</div>
          <div className="metric">{formatValue(card.reliability_score)}</div>
        </div>
        <div>
          <div className="muted">Company Rank</div>
          <div className="metric">{formatValue(card.company_rank)}</div>
        </div>
        <div>
          <div className="muted">Department Rank</div>
          <div className="metric">{formatValue(card.department_rank)}</div>
        </div>
        <div>
          <div className="muted">Attendance %</div>
          <div className="metric">{formatValue(card.attendance_percentage)}</div>
        </div>
        <div>
          <div className="muted">Late %</div>
          <div className="metric">{formatValue(card.late_frequency_percentage)}</div>
        </div>
        <div>
          <div className="muted">Absence %</div>
          <div className="metric">{formatValue(card.absence_frequency_percentage)}</div>
        </div>
        <div>
          <div className="muted">Leave %</div>
          <div className="metric">{formatValue(card.leave_frequency_percentage)}</div>
        </div>
        <div>
          <div className="muted">Corrections %</div>
          <div className="metric">{formatValue(card.correction_frequency_percentage)}</div>
        </div>
      </div>
      <div className="muted">
        Window: {card.window_start_date ?? "-"} to {card.window_end_date ?? "-"}
      </div>
    </div>
  );
};
