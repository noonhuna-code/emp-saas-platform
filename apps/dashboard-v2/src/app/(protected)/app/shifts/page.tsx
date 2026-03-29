import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import ShiftsPageClient from "./ShiftsPageClient";

export default async function ShiftsPage() {
  const session = await getServerSession();
  const allowed = session.permissions.includes("view_attendance") || session.permissions.includes("manage_attendance");
  if (!allowed || !session.employeeId) {
    redirect("/403");
  }

  return <ShiftsPageClient />;
}
