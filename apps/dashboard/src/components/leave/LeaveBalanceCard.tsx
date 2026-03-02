import type { LeaveBalance } from "@/lib/types/leave";

export const LeaveBalanceCard = ({ balances }: { balances: LeaveBalance[] }) => {
  if (!balances.length) {
    return <div className="card">No leave balances available.</div>;
  }

  return (
    <div className="card stack">
      <h3>Leave Balances</h3>
      <div className="grid-2">
        {balances.map((balance) => (
          <div key={balance.id} className="card card--nested stack" style={{ gap: 6 }}>
            <div className="muted">{balance.leave_type_name ?? "Leave"}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{balance.remaining_days}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {balance.used_days} used - {balance.entitled_days} entitled
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
