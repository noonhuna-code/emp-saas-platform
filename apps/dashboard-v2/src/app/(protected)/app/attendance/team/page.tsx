import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { AttendanceTeamPageClient } from "./AttendanceTeamPageClient";

export default async function AttendanceTeamPage() {
  const session = await getServerSession();
  if (!session.permissions.includes("manage_attendance")) {
    redirect("/403");
  }

  return <AttendanceTeamPageClient />;
}
