import { MyProfileScreen } from "@/components/profile/MyProfileScreen";
import { getServerSession } from "@/lib/server/auth";

export default async function MyProfilePage() {
  const session = await getServerSession();
  return <MyProfileScreen initialEmployeeId={session.employeeId ?? null} />;
}
