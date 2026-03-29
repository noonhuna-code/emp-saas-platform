import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { AttendanceTeamPageClient } from "./AttendanceTeamPageClient";

export default async function AttendanceTeamPage() {
  const session = await getServerSession();
  const canViewTeamAttendance =
    session.permissions.includes("manage_attendance") ||
    session.permissions.includes("manage_employees") ||
    session.permissions.includes("manage_company");
  if (!canViewTeamAttendance) {
    redirect("/403");
  }

  return <AttendanceTeamPageClient />;
}
