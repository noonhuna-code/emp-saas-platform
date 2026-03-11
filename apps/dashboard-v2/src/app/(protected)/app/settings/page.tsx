import { PageContainer, PageHeader, SurfacePanel } from "@/components/dashboard-v2/PagePrimitives";

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Settings"
        title="Workspace configuration"
        description="Settings is prepared for company preferences, approval policy tuning, and user experience controls in dashboard-v2."
      />
      <SurfacePanel title="Settings foundation" description="This page is intentionally lightweight and ready for configuration panels in the next migration step.">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
          V2 settings workspace scaffolded. Existing backend contracts remain unchanged.
        </div>
      </SurfacePanel>
    </PageContainer>
  );
}
