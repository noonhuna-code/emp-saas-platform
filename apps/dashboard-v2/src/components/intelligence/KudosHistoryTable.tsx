import type { KudosItem } from "@/lib/types/intelligence";

export const KudosHistoryTable = ({ items }: { items: KudosItem[] }) => {
  return (
    <div className="card stack">
      <h3>Kudos History</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Receiver</th>
            <th>Points</th>
            <th>Message</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.receiver_name ?? item.receiver_employee_id}</td>
              <td>{item.points}</td>
              <td>{item.message ?? "-"}</td>
              <td>{item.created_at}</td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="muted">No kudos yet</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
};
