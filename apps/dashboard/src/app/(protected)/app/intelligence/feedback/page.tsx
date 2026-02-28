import { getServerSession } from "@/lib/server/auth";
import { FeedbackPageClient } from "./FeedbackPageClient";

export default async function FeedbackPage() {
  const session = await getServerSession();
  const canSubmit = session.permissions.includes("manage_employees");
  return <FeedbackPageClient canSubmit={canSubmit} />;
}
