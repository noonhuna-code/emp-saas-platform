import { EmployeeProfileScreen } from "@/components/profile/EmployeeProfileScreen";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  return <EmployeeProfileScreen employeeId={employeeId} />;
}
