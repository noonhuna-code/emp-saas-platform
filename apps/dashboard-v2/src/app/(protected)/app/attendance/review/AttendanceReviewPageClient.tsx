"use client";

import { CorrectionReviewTable } from "@/components/attendance/CorrectionReviewTable";

export const AttendanceReviewPageClient = ({
  initialEmployeeId,
  focusId
}: {
  initialEmployeeId?: string;
  focusId?: string;
}) => {
  return (
    <div className="page-wrap stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0 }}>Attendance Correction Review</h1>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Team lead and manager review queue for pending attendance correction requests.
            </p>
          </div>
          <span className="badge">Pending only</span>
        </div>
      </section>

      <CorrectionReviewTable initialEmployeeId={initialEmployeeId} focusId={focusId} />
    </div>
  );
};
