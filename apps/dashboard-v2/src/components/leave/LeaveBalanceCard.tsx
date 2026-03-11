import type { LeaveBalance } from "@/lib/types/leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const LeaveBalanceCard = ({ balances }: { balances: LeaveBalance[] }) => {
  if (!balances.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leave Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No leave balances available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Leave Balances</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {balances.map((balance) => (
          <Card key={balance.id} className="rounded-xl border-border shadow-sm">
            <CardContent className="space-y-2 p-4">
              <div className="text-sm text-muted-foreground">{balance.leave_type_name ?? "Leave"}</div>
              <div className="text-2xl font-semibold">{balance.remaining_days}</div>
              <div className="text-xs text-muted-foreground">
                Used {balance.used_days} • Annual {balance.entitled_days}
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};
