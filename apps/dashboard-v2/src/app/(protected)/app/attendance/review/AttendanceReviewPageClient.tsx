"use client";

import Link from "next/link";
import { CorrectionReviewTable } from "@/components/attendance/CorrectionReviewTable";
import {
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const AttendanceReviewPageClient = ({
  initialEmployeeId,
  focusId
}: {
  initialEmployeeId?: string;
  focusId?: string;
}) => {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Operations"
        title="Attendance correction review"
        description="Review pending Late Login and correction requests without leaving the team lead operations flow."
        chips={["Pending only", "Team lead + manager review"]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/app/attendance/team" className={buttonVariants({ variant: "secondary", className: "rounded-full" })}>
              Team attendance
            </Link>
            <Link href="/app/leave/review" className={buttonVariants({ variant: "secondary", className: "rounded-full" })}>
              Leave approvals
            </Link>
            <Link href="/app/attendance/shifts" className={buttonVariants({ variant: "secondary", className: "rounded-full" })}>
              Assign shifts
            </Link>
            <Link href="/app/attendance/shift-swaps" className={buttonVariants({ variant: "secondary", className: "rounded-full" })}>
              Shift changes
            </Link>
          </div>
        }
      />

      <StatGrid>
        <StatCard
          label="Queue state"
          value="Pending"
          hint="This workspace only shows requests still waiting on review."
        />
        <StatCard
          label="Review model"
          value="2-step"
          hint="Approve valid corrections and reject incomplete or unsupported requests."
        />
        <StatCard
          label="Focus filter"
          value={focusId ? "Focused" : "All"}
          hint={focusId ? "A specific request was opened from another workflow." : "Showing your scoped team queue."}
        />
        <StatCard
          label="Employee filter"
          value={initialEmployeeId ? "Scoped" : "Open"}
          hint={initialEmployeeId ? "Filtered to one employee context." : "Switch employees directly inside the table."}
        />
      </StatGrid>

      <SurfacePanel
        title="Correction review queue"
        description="Use the live queue below to approve valid corrections, reject unsupported requests, and keep attendance history consistent."
        actions={<Badge className="rounded-full border-slate-200 bg-slate-50 text-slate-700">Pending workflow</Badge>}
      >
        <CorrectionReviewTable initialEmployeeId={initialEmployeeId} focusId={focusId} />
      </SurfacePanel>
    </PageContainer>
  );
};
