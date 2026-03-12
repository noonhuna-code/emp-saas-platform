import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const profileFieldClassName =
  "h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";

export const profileTextAreaClassName =
  "min-h-[120px] rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";

export const profileLabelClassName = "grid gap-2 text-sm font-medium text-slate-700";
export const profileNestedPanelClassName = "rounded-[20px] border border-slate-200 bg-slate-50/70 p-4";
export const profileReadonlyTileClassName = "rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm";
export const profileEmptyStateClassName = "rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600";

export const ProfileSectionCard = ({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <Card className={cn("rounded-[24px] border border-slate-200/80 bg-white/92 shadow-[0_20px_60px_rgba(15,23,42,0.06)]", className)}>
    <CardHeader className="pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="text-xl font-semibold tracking-tight text-slate-950">{title}</CardTitle>
          {description ? <CardDescription className="max-w-3xl text-sm leading-6 text-slate-600">{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex items-center gap-2 self-start">{actions}</div> : null}
      </div>
    </CardHeader>
    <CardContent className="space-y-5 pt-0">{children}</CardContent>
  </Card>
);

export const ProfilePanel = ({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn(profileNestedPanelClassName, className)}>
    <div className="mb-4 space-y-1">
      <p className="text-sm font-semibold tracking-tight text-slate-900">{title}</p>
      {description ? <p className="text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
    {children}
  </div>
);

export const ReadonlyField = ({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) => (
  <div className={cn(profileReadonlyTileClassName, className)}>
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
  </div>
);

export const SectionActionBar = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap justify-end gap-2 pt-1">{children}</div>
);
