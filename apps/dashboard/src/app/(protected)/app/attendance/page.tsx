import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { clockInAction, clockOutAction } from "./actions";
import { AttendancePageClient } from "./AttendancePageClient";

export default async function AttendancePage() {
  const session = await getServerSession();
  const canViewAttendance =
    session.permissions.includes("manage_attendance") || session.permissions.includes("view_attendance");

  if (!canViewAttendance) {
    redirect("/403");
  }

  if (!session.employeeId) {
    if (session.permissions.includes("manage_attendance")) {
      redirect("/app/attendance/team");
    }
    redirect("/403");
  }

  return <AttendancePageClient clockInAction={clockInAction} clockOutAction={clockOutAction} />;
}
