import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const MetricCard = ({
  label,
  value,
  hint,
  trend,
  accent = "default",
  footer
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
  accent?: "default" | "success" | "warning" | "danger" | "info";
  footer?: ReactNode;
}) => {
  return (
    <Card
      className={cn(
        "rounded-xl border-border shadow-sm",
        accent === "info" && "border-l-2 border-l-[var(--accent)]",
        accent === "success" && "border-l-2 border-l-[var(--success)]",
        accent === "warning" && "border-l-2 border-l-[var(--warning)]",
        accent === "danger" && "border-l-2 border-l-[var(--danger)]"
      )}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          {trend ? <span className="text-xs text-[var(--accent)]">{trend}</span> : null}
        </div>
        <p className="text-3xl font-semibold leading-none tracking-tight">{value}</p>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        {footer ? <div className="pt-1">{footer}</div> : null}
      </CardContent>
    </Card>
  );
};