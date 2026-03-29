import type { LeaveBalance } from "@/lib/types/leave";
import { SurfacePanel } from "@/components/dashboard-v2/PagePrimitives";

export const LeaveBalanceCard = ({ balances }: { balances: LeaveBalance[] }) => {
  return (
    <SurfacePanel title="Leave balances" description="Compact balance register for the currently entitled leave types.">
      {!balances.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-600">
          No leave balances available.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-slate-200">
          <div className="max-h-[360px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Entitled</th>
                  <th className="px-4 py-3">Used</th>
                  <th className="px-4 py-3">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {balances.map((balance) => (
                  <tr key={balance.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{balance.leave_type_name ?? "Leave"}</td>
                    <td className="px-4 py-3 text-slate-700">{balance.entitled_days}</td>
                    <td className="px-4 py-3 text-slate-700">{balance.used_days}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{balance.remaining_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SurfacePanel>
  );
};
