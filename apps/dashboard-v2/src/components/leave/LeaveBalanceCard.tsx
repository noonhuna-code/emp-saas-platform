import type { LeaveBalance } from "@/lib/types/leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const LeaveBalanceCard = ({ balances }: { balances: LeaveBalance[] }) => {
  if (!balances.length) {
    return (
      <Card className="rounded-[24px] border border-slate-200/80 bg-white/92 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-950">Leave balances</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-600">
            No leave balances available.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[24px] border border-slate-200/80 bg-white/92 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-950">Leave balances</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
        {balances.map((balance) => (
          <Card key={balance.id} className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 shadow-none">
            <CardContent className="space-y-2 p-4">
              <div className="text-sm text-slate-500">{balance.leave_type_name ?? "Leave"}</div>
              <div className="text-2xl font-semibold tracking-tight text-slate-950">{balance.remaining_days}</div>
              <div className="text-xs text-slate-500">
                Used {balance.used_days} • Annual {balance.entitled_days}
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};

