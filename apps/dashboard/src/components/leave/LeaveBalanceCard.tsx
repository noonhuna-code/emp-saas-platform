import type { LeaveBalance } from "@/lib/types/leave";

export const LeaveBalanceCard = ({ balances }: { balances: LeaveBalance[] }) => {
  if (!balances.length) {
    return <div className="card">No leave balances available.</div>;
  }

  return (
    <div className="card stack">
      <h3>Leave Balances</h3>
      <div className="grid-two">
        {balances.map((balance) => (
          <div key={balance.id} className="tile">
            <div className="muted">{balance.leave_type_name ?? "Leave"}</div>
            <div className="metric">{balance.remaining_days}</div>
            <div className="meta">
              {balance.used_days} used � {balance.entitled_days} entitled
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
