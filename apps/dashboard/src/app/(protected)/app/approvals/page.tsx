import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { ApprovalsPageClient } from "./ApprovalsPageClient";

export default async function ApprovalsPage() {
  const session = await getServerSession();
  const canManage = session.permissions.includes("manage_employees") || session.permissions.includes("manage_attendance");
  if (!canManage) {
    redirect("/403");
  }

  return <ApprovalsPageClient />;
}
