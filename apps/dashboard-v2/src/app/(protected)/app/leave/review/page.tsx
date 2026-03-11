import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { LeaveReviewPageClient } from "./LeaveReviewPageClient";

export default async function LeaveReviewPage({
  searchParams
}: {
  searchParams?: Promise<{ employeeId?: string; focusId?: string }>;
}) {
  const session = await getServerSession();
  if (!session.permissions.includes("manage_employees")) {
    redirect("/403");
  }

  const resolvedParams = searchParams ? await searchParams : undefined;

  return (
    <LeaveReviewPageClient
      initialEmployeeId={resolvedParams?.employeeId ?? ""}
      focusId={resolvedParams?.focusId ?? ""}
    />
  );
}
