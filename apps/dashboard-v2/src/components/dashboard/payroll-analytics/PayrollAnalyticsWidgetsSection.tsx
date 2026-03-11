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
    <section className="stack" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div className="stack" style={{ gap: 2 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <p className="muted" style={{ margin: 0 }}>{subtitle}</p>
        </div>
        <PayrollAnalyticsRangePicker months={months} onChange={setMonths} />
      </div>

      <div className="grid-2">
        <DashboardWidgetGuard widget="payroll_trend">
          <PayrollCostTrendWidget months={months} />
        </DashboardWidgetGuard>
        <DashboardWidgetGuard widget="payroll_delivery_success">
          <PayrollDeliverySuccessWidget months={months} />
        </DashboardWidgetGuard>
      </div>

      <div className="grid-2">
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
