import { PayrollRunTimelinePageClient } from "./PayrollRunTimelinePageClient";

type PayrollRunTimelinePageProps = {
  params: Promise<{ runId: string }>;
  searchParams?: Promise<{ updated?: string }>;
};

const resolveLifecycleFlash = (updated?: string): string | null => {
  const normalized = (updated ?? "").trim().toLowerCase();
  if (normalized === "paid") return "Payroll run marked as paid.";
  if (normalized === "archive" || normalized === "archived") return "Payroll run archived.";
  return null;
};

export default async function PayrollRunTimelinePage({ params, searchParams }: PayrollRunTimelinePageProps) {
  const { runId } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const flashMessage = resolveLifecycleFlash(resolvedSearch?.updated);
  return <PayrollRunTimelinePageClient runId={runId} flashMessage={flashMessage} />;
}
