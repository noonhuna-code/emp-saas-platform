import type { LeaveRequest } from "@/lib/types/leave";

export const LeaveStatusTimeline = ({ request }: { request?: LeaveRequest | null }) => {
  if (!request) {
    return <div className="card">Select a leave request to see timeline.</div>;
  }

  const items = [
    { label: "Submitted", date: request.created_at },
    request.approved_at ? { label: "Reviewed", date: request.approved_at } : null,
    { label: "Last Updated", date: request.updated_at }
  ].filter(Boolean) as Array<{ label: string; date: string }>;

  return (
    <div className="card stack">
      <h3>Status Timeline</h3>
      <ul className="stack">
        {items.map((item) => (
          <li key={item.label} className="row" style={{ justifyContent: "space-between" }}>
            <span>{item.label}</span>
            <span className="muted">{item.date}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};