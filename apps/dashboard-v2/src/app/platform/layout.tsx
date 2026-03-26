import { redirect } from "next/navigation";
import { PlatformShell } from "@/components/shell/PlatformShell";
import { resolveDashboardPersona } from "@/lib/dashboard/capabilities";
import { getServerSession } from "@/lib/server/auth";

const PUBLIC_SIGN_IN_URL =
  process.env.NEXT_PUBLIC_MARKETING_SIGN_IN_URL ??
  "https://emp-saas-platform.vercel.app/sign-in";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session.accessToken) {
    redirect(PUBLIC_SIGN_IN_URL);
  }

  const persona = resolveDashboardPersona({
    role: session.role,
    permissions: session.permissions
  });

  if (persona !== "platform_owner") {
    redirect("/403");
  }

  return (
    <PlatformShell email={session.email} role={session.role}>
      {children}
    </PlatformShell>
  );
}
