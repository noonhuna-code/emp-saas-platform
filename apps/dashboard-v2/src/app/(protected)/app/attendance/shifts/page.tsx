import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import ShiftAssignmentsPageClient from "./ShiftAssignmentsPageClient";

export default async function ShiftAssignmentsPage() {
  const session = await getServerSession();
  const allowed = session.permissions.includes("manage_attendance") || session.permissions.includes("manage_employees");
  if (!allowed) {
    redirect("/403");
  }

  return <ShiftAssignmentsPageClient />;
}
