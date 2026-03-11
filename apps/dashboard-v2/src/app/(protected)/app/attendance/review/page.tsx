import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { AttendanceReviewPageClient } from "./AttendanceReviewPageClient";

export default async function AttendanceReviewPage({
  searchParams
}: {
  searchParams?: Promise<{ employeeId?: string; focusId?: string }>;
}) {
  const session = await getServerSession();
  if (!session.permissions.includes("manage_attendance")) {
    redirect("/403");
  }

  const resolvedParams = searchParams ? await searchParams : undefined;

  return (
    <AttendanceReviewPageClient
      initialEmployeeId={resolvedParams?.employeeId ?? ""}
      focusId={resolvedParams?.focusId ?? ""}
    />
  );
}
