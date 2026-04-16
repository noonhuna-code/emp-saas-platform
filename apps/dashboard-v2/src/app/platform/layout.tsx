import { redirect } from "next/navigation";
import { PlatformShell } from "@/components/shell/PlatformShell";
import { resolveDashboardPersona } from "@/lib/dashboard/capabilities";
import { getServerSession } from "@/lib/server/auth";
import { buildPublicWebsiteUrl } from "@/lib/site";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session.accessToken) {
    redirect(
      process.env.NODE_ENV === "production"
        ? buildPublicWebsiteUrl("/sign-in", { next: "/platform" })
        : "/login?next=%2Fplatform"
    );
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
