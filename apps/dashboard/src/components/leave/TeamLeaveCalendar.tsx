import type { LeaveRequest } from "@/lib/types/leave";

export const TeamLeaveCalendar = ({ requests }: { requests: LeaveRequest[] }) => {
  return (
    <div className="card stack">
      <h3>Team Leave Calendar</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Dates</th>
            <th>Status</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id}>
              <td>{req.employee_name ?? req.employee_id}</td>
              <td>{req.start_date} ? {req.end_date}</td>
              <td>{req.status}</td>
              <td>{req.leave_type_name ?? req.leave_type_id}</td>
            </tr>
          ))}
          {requests.length === 0 ? (
            <tr>
              <td colSpan={4} className="muted">No leave in this range</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
};