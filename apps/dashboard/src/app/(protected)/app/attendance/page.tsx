import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { clockInAction, clockOutAction } from "./actions";
import { AttendancePageClient } from "./AttendancePageClient";

export default async function AttendancePage() {
  const session = await getServerSession();
  if (!session.permissions.includes("manage_attendance")) {
    redirect("/403");
  }

  return <AttendancePageClient clockInAction={clockInAction} clockOutAction={clockOutAction} />;
}

