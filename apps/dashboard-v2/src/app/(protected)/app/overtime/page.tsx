import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { OvertimePageClient } from "./OvertimePageClient";

export default async function OvertimePage() {
  const session = await getServerSession();

  if (!session.employeeId) {
    if (session.permissions.includes("manage_attendance")) {
      redirect("/app/overtime/review");
    }
    redirect("/403");
  }

  return <OvertimePageClient />;
}
