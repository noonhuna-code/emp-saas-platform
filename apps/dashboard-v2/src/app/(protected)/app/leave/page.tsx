import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { LeavePageClient } from "./LeavePageClient";

export default async function LeavePage() {
  const session = await getServerSession();

  if (!session.employeeId) {
    if (session.permissions.includes("manage_employees") || session.permissions.includes("manage_attendance")) {
      redirect("/app/leave/review");
    }
    redirect("/403");
  }

  return <LeavePageClient />;
}
