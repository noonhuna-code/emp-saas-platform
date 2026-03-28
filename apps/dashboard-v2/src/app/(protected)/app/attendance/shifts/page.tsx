import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import ShiftAssignmentsPageClient from "./ShiftAssignmentsPageClient";

export default async function ShiftAssignmentsPage() {
  const session = await getServerSession();
  const allowed = session.permissions.some((permission) =>
    ["manage_attendance", "manage_employees", "assign_shifts", "manage_shifts"].includes(permission)
  );
  if (!allowed) {
    redirect("/403");
  }

  return <ShiftAssignmentsPageClient />;
}
