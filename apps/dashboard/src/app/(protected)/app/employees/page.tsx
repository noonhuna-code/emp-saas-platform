import { redirect } from "next/navigation";
import { EmployeeDirectoryScreen } from "@/components/employees/EmployeeDirectoryScreen";
import { getServerSession } from "@/lib/server/auth";

export default async function EmployeesPage() {
  const session = await getServerSession();
  if (!session.permissions.includes("manage_employees")) {
    redirect("/403");
  }

  return <EmployeeDirectoryScreen />;
}
