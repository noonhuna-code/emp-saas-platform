import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { buildServiceContext } from "@/lib/server/service-context";
import { listBreakAssignments, listShiftAssignments, listShiftTemplates } from "@emp/services/attendance.service";
import ShiftsPageClient from "./ShiftsPageClient";

export default async function ShiftsPage() {
  const session = await getServerSession();
  const allowed = session.permissions.includes("view_attendance") || session.permissions.includes("manage_attendance");
  if (!allowed || !session.employeeId) {
    redirect("/403");
  }

  const ctx = await buildServiceContext();
  const employeeId = session.employeeId;
  const [assignmentsResult, breaksResult, templatesResult] = await Promise.allSettled([
    listShiftAssignments(ctx, { employeeId, limit: 60 }),
    listBreakAssignments(ctx, { employeeId, limit: 80 }),
    listShiftTemplates(ctx),
  ]);

  const initialAssignments =
    assignmentsResult.status === "fulfilled" && assignmentsResult.value.ok && assignmentsResult.value.data
      ? assignmentsResult.value.data.rows ?? []
      : [];
  const initialBreakAssignments =
    breaksResult.status === "fulfilled" && breaksResult.value.ok && breaksResult.value.data
      ? breaksResult.value.data.rows ?? []
      : [];
  const initialTemplates =
    templatesResult.status === "fulfilled" && templatesResult.value.ok && templatesResult.value.data
      ? templatesResult.value.data.rows ?? []
      : [];

  const initialError =
    assignmentsResult.status === "fulfilled" && !assignmentsResult.value.ok
      ? assignmentsResult.value.error ?? "Unable to load shift assignments"
      : assignmentsResult.status === "rejected"
        ? assignmentsResult.reason instanceof Error
          ? assignmentsResult.reason.message
          : "Unable to load shift assignments"
        : null;

  return (
    <ShiftsPageClient
      employeeId={employeeId}
      initialAssignments={initialAssignments}
      initialBreakAssignments={initialBreakAssignments}
      initialTemplates={initialTemplates}
      initialError={initialError}
    />
  );
}
