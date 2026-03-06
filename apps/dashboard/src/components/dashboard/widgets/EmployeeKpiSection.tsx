"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Donut } from "@/components/shared/Charts";

type EmployeeKpiSectionProps = {
  workMinutes: number | null;
  leaveUtilization: number;
  pendingShiftSwaps: number;
  upcomingLeave: string;
  unreadNotifications: number;
};

const formatMinutes = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  const hours = Math.floor(value / 60);
  const minutes = Math.max(0, value % 60);
  return `${hours}h ${minutes}m`;
};

export default function EmployeeKpiSection({
  workMinutes,
  leaveUtilization,
  pendingShiftSwaps,
  upcomingLeave,
  unreadNotifications
}: EmployeeKpiSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Card className="rounded-xl border-border shadow-sm">
        <CardContent className="space-y-2 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Hours this week</p>
          <p className="text-3xl font-semibold leading-none">{formatMinutes(workMinutes)}</p>
        </CardContent>
      </Card>
      <Card className="rounded-xl border-border shadow-sm">
        <CardContent className="space-y-2 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Leave utilization</p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-semibold leading-none">{leaveUtilization}%</p>
            <Donut value={leaveUtilization} />
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-xl border-border shadow-sm">
        <CardContent className="space-y-2 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Pending shift swaps</p>
          <p className="text-3xl font-semibold leading-none">{pendingShiftSwaps}</p>
        </CardContent>
      </Card>
      <Card className="rounded-xl border-border shadow-sm">
        <CardContent className="space-y-2 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Upcoming leave</p>
          <p className="text-lg font-semibold">{upcomingLeave}</p>
        </CardContent>
      </Card>
      <Card className="rounded-xl border-border shadow-sm">
        <CardContent className="space-y-2 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Notifications</p>
          <p className="text-3xl font-semibold leading-none">{unreadNotifications}</p>
        </CardContent>
      </Card>
    </div>
  );
}
