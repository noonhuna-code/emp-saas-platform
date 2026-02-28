import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { OvertimeReviewPageClient } from "./OvertimeReviewPageClient";

export default async function OvertimeReviewPage() {
  const session = await getServerSession();
  if (!session.permissions.includes("manage_attendance")) {
    redirect("/403");
  }

  return <OvertimeReviewPageClient />;
}
