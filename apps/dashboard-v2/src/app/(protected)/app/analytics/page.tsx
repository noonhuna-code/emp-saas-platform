import { PageContainer, PageHeader, SurfacePanel } from "@/components/dashboard-v2/PagePrimitives";

export default function AnalyticsPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Analytics"
        title="Cross-functional workforce insights"
        description="Analytics is scaffolded for lazy-loaded charts, comparisons, and executive-level reporting surfaces."
      />
      <SurfacePanel title="Analytics foundation" description="Reserved for chart-ready widgets and trend comparisons in a later pass.">
        <div className="grid gap-4 md:grid-cols-3">
          {["Attendance trends", "Leave utilization", "Payroll variance"].map((item) => (
            <div key={item} className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              {item}
            </div>
          ))}
        </div>
      </SurfacePanel>
    </PageContainer>
  );
}
