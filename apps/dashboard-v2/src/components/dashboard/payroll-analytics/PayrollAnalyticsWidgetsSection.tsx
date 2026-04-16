"use client";

import { DashboardWidgetGuard } from "@/components/dashboard/dashboard-widget-guard";
import { PayrollCloseoutLatencyWidget } from "./PayrollCloseoutLatencyWidget";
import { PayrollCostTrendWidget } from "./PayrollCostTrendWidget";
import { PayrollDeliverySuccessWidget } from "./PayrollDeliverySuccessWidget";
import { PayrollGrowthWidget } from "./PayrollGrowthWidget";
import { PayrollAnalyticsRangePicker, usePayrollAnalyticsRange } from "./_shared";

export const PayrollAnalyticsWidgetsSection = ({
  title = "Payroll analytics",
  subtitle = "Read-only executive payroll insights"
}: {
  title?: string;
  subtitle?: string;
}) => {
  const { months, setMonths } = usePayrollAnalyticsRange(12);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/70 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{title}</h2>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <PayrollAnalyticsRangePicker months={months} onChange={setMonths} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardWidgetGuard widget="payroll_trend">
          <PayrollCostTrendWidget months={months} />
        </DashboardWidgetGuard>
        <DashboardWidgetGuard widget="payroll_delivery_success">
          <PayrollDeliverySuccessWidget months={months} />
        </DashboardWidgetGuard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardWidgetGuard widget="payroll_closeout_latency">
          <PayrollCloseoutLatencyWidget months={months} />
        </DashboardWidgetGuard>
        <DashboardWidgetGuard widget="payroll_growth">
          <PayrollGrowthWidget months={months} />
        </DashboardWidgetGuard>
      </div>
    </section>
  );
};
