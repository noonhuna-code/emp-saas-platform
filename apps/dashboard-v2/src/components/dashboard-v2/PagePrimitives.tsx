import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  Crown,
  Landmark,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const ROLE_ICONS = {
  founder: Crown,
  admin: Landmark,
  hr: Users,
  finance: WalletCards,
  manager: BriefcaseBusiness,
  team_lead: ClipboardCheck,
  employee: Sparkles,
  it: ShieldCheck,
  platform_owner: Building2
};

export const PageContainer = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("space-y-8", className)}>{children}</div>
);

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
    <div className="space-y-3">
      {eyebrow ? <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-300">{eyebrow}</div> : null}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-4xl">{title}</h1>
        {description ? <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">{description}</p> : null}
      </div>
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);

export const SurfacePanel = ({
  title,
  description,
  children,
  className,
  actions
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) => (
  <Card className={cn("rounded-3xl border-slate-200/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/70", className)}>
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle className="text-xl font-semibold tracking-tight">{title}</CardTitle>
          {description ? <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export const FeatureCallout = ({ title, description, badge }: { title: string; description: string; badge?: string }) => (
  <div className="rounded-3xl border border-slate-200/80 bg-[linear-gradient(135deg,rgba(59,130,246,0.08),rgba(255,255,255,0.95),rgba(14,165,233,0.04))] p-6 shadow-sm dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(30,64,175,0.22),rgba(2,6,23,0.9),rgba(14,116,144,0.14))]">
    <div className="space-y-2">
      {badge ? <Badge className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">{badge}</Badge> : null}
      <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h2>
      <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  </div>
);

export const OverviewChips = ({ chips }: { chips: string[] }) => (
  <div className="flex flex-wrap items-center gap-2">
    {chips.map((chip) => (
      <Badge key={chip} className="rounded-full px-3 py-1.5 text-xs font-medium">{chip}</Badge>
    ))}
  </div>
);

export const DashboardRail = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">{children}</div>
);
