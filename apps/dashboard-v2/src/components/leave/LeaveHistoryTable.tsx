import type { LeaveRequest } from "@/lib/types/leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/StatusChip";

export const LeaveHistoryTable = ({
  requests,
  onCancel,
  busy,
  page,
  hasNext,
  onPageChange
}: {
  requests: LeaveRequest[];
  onCancel?: (requestId: string, employeeId: string) => void;
  busy?: boolean;
  page?: number;
  hasNext?: boolean;
  onPageChange?: (page: number) => void;
}) => {
  const currentPage = page ?? 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Leave History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Dates</th>
                <th>Type</th>
                <th>Status</th>
                <th>Total Days</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>{req.start_date} ? {req.end_date}</td>
                  <td>{req.leave_type_name ?? req.leave_type_id}</td>
                  <td><StatusChip label={req.status} compact /></td>
                  <td>{req.total_days}</td>
                  <td>
                    {req.status === "pending" && onCancel ? (
                      <button className="secondary-btn" onClick={() => onCancel(req.id, req.employee_id)} disabled={busy}>
                        Cancel
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-sm text-muted-foreground">No leave requests</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {onPageChange ? (
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <span className="text-xs text-muted-foreground">Page {currentPage}</span>
            <div className="row">
              <button
                className="secondary-btn"
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              >
                Previous
              </button>
              <button
                className="secondary-btn"
                type="button"
                disabled={!hasNext}
                onClick={() => onPageChange(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
