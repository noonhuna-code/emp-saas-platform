import { PageContainer, PageHeader, SurfacePanel } from "@/components/dashboard-v2/PagePrimitives";

export default function ProjectsPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Projects"
        title="Delivery, staffing, and execution"
        description="Projects is scaffolded in dashboard-v2 and ready to adopt the shared workforce services without rebuilding backend logic."
      />
      <SurfacePanel title="Projects foundation" description="This page is reserved for project boards, staffing allocation, and execution tracking in the next UI pass.">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
          V2 projects workspace scaffolded. Reuse existing project services through @emp/* in the next step.
        </div>
      </SurfacePanel>
    </PageContainer>
  );
}
