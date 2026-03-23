import dynamic from "next/dynamic";
import { getServerSession } from "@/lib/server/auth";
import { LoadingState } from "@/components/states/LoadingState";

const ProjectsPageClient = dynamic(() => import("./ProjectsPageClient"), {
  loading: () => <LoadingState label="Loading projects workspace..." />,
});

export default async function ProjectsPage() {
  const session = await getServerSession();

  return (
    <ProjectsPageClient
      role={session.role}
      permissions={session.permissions}
    />
  );
}
