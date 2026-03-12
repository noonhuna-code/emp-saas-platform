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
  WalletCards,
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
  platform_owner: Building2,
};

export const PageContainer = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-6 lg:px-8", className)}>{children}</div>
);

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="flex flex-col gap-4 rounded-[24px] border border-white/60 bg-white/88 px-6 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:px-7 lg:flex-row lg:items-center lg:justify-between">
    <div className="space-y-3">
      {eyebrow ? (
        <Badge className="w-fit rounded-full border-blue-200 bg-blue-50 text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-700">
          {eyebrow}
        </Badge>
      ) : null}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.1rem]">{title}</h1>
        {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">{description}</p> : null}
      </div>
    </div>
    {actions ? <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">{actions}</div> : null}
  </div>
);

export const SurfacePanel = ({
  title,
  description,
  children,
  className,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) => (
  <Card className={cn("rounded-[24px] border border-slate-200/80 bg-white/92 shadow-[0_20px_60px_rgba(15,23,42,0.06)]", className)}>
    <CardHeader className="pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle className="text-lg font-semibold tracking-tight text-slate-950">{title}</CardTitle>
          {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </CardHeader>
    <CardContent className="pt-0">{children}</CardContent>
  </Card>
);

export const FeatureCallout = ({ title, description, badge }: { title: string; description: string; badge?: string }) => (
  <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(239,246,255,0.9))] px-6 py-6 shadow-[0_24px_70px_rgba(37,99,235,0.08)]">
    <div className="space-y-3">
      {badge ? (
        <Badge className="rounded-full border-blue-200 bg-white/90 text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-700">
          {badge}
        </Badge>
      ) : null}
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">{title}</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
      </div>
    </div>
  </div>
);

export const OverviewChips = ({ chips }: { chips: string[] }) => (
  <div className="flex flex-wrap items-center gap-2">
    {chips.map((chip) => (
      <Badge key={chip} className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600">
        {chip}
      </Badge>
    ))}
  </div>
);

export const DashboardRail = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]", className)}>{children}</div>
);

export const StatGrid = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>
);

export const StatCard = ({
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
  <Card className={cn("rounded-[22px] border border-slate-200/80 bg-white/92 shadow-[0_18px_40px_rgba(15,23,42,0.05)]", className)}>
    <CardContent className="space-y-3 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      {hint ? <div className="text-sm text-slate-600">{hint}</div> : null}
    </CardContent>
  </Card>
);

export const StatePanel = ({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) => (
  <Card className={cn("rounded-[22px] border border-slate-200/80 bg-white/92 shadow-sm", className)}>
    <CardContent className="space-y-3 p-6">
      <div className="space-y-1">
        <p className="text-base font-semibold tracking-tight text-slate-950">{title}</p>
        {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </CardContent>
  </Card>
);

