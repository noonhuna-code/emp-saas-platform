import { memo, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
  accent?: "default" | "success" | "warning" | "danger" | "info";
  footer?: ReactNode;
};

const MetricCardComponent = ({
  label,
  value,
  hint,
  trend,
  accent = "default",
  footer
}: MetricCardProps) => {
  return (
    <Card
      className={cn(
        "metric-card-surface rounded-xl border-border shadow-sm",
        accent === "info" && "metric-card-surface--info",
        accent === "success" && "metric-card-surface--success",
        accent === "warning" && "metric-card-surface--warning",
        accent === "danger" && "metric-card-surface--danger"
      )}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            <p className="text-3xl font-semibold leading-none tracking-tight text-foreground">{value}</p>
          </div>
          {trend ? <span className="metric-card-surface__trend">{trend}</span> : null}
        </div>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        {footer ? <div className="pt-1">{footer}</div> : null}
      </CardContent>
    </Card>
  );
};

export const MetricCard = memo(MetricCardComponent);
MetricCard.displayName = "MetricCard";
