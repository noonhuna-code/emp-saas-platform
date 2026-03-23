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
  <div
    className={cn(
      "mx-auto flex w-full max-w-[1680px] flex-col gap-5 px-4 pb-6 pt-4 sm:px-6 sm:pb-7 sm:pt-5 lg:gap-6 lg:px-8 lg:pb-8 lg:pt-6",
      className
    )}
  >
    {children}
  </div>
);

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  chips,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  chips?: string[];
}) => (
  <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(248,250,255,0.92))] shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
    <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {eyebrow ? (
            <Badge className="w-fit rounded-full border-blue-200/80 bg-blue-50/90 text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-700">
              {eyebrow}
            </Badge>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <h1 className="max-w-4xl text-[1.72rem] font-semibold tracking-[-0.045em] text-slate-950 sm:text-[2rem]">
            {title}
          </h1>
          {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">{description}</p> : null}
        </div>
        {chips && chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <Badge key={chip} className="rounded-full border border-slate-200 bg-white/88 px-3 py-1 text-[11px] font-medium text-slate-600">
                {chip}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:max-w-[32rem] lg:justify-end">{actions}</div> : null}
    </div>
  </div>
);

export const SurfacePanel = ({
  title,
  description,
  children,
  className,
  actions,
  tone = "default",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  tone?: "default" | "subtle" | "spotlight";
}) => (
  <Card
    className={cn(
      "rounded-[26px] border shadow-[0_20px_60px_rgba(15,23,42,0.06)]",
      tone === "default" && "border-slate-200/80 bg-white/92",
      tone === "subtle" && "border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.92))]",
      tone === "spotlight" &&
        "border-blue-200/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,246,255,0.92))] shadow-[0_22px_70px_rgba(37,99,235,0.08)]",
      className
    )}
  >
    <CardHeader className="gap-4 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <CardTitle className="text-lg font-semibold tracking-tight text-slate-950">{title}</CardTitle>
          {description ? <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </CardHeader>
    <CardContent className="pt-0">{children}</CardContent>
  </Card>
);

export const FeatureCallout = ({ title, description, badge }: { title: string; description: string; badge?: string }) => (
  <div className="rounded-[28px] border border-blue-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.92))] px-5 py-5 shadow-[0_18px_56px_rgba(37,99,235,0.07)] sm:px-6 sm:py-6">
    <div className="space-y-3">
      {badge ? (
        <Badge className="rounded-full border-blue-200 bg-white/90 text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-700">
          {badge}
        </Badge>
      ) : null}
      <div className="space-y-1.5">
        <h2 className="max-w-3xl text-[1.6rem] font-semibold tracking-[-0.045em] text-slate-950 sm:text-[1.85rem]">{title}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px]">{description}</p>
      </div>
    </div>
  </div>
);

export const OverviewChips = ({ chips }: { chips: string[] }) => (
  <div className="flex flex-wrap items-center gap-2">
    {chips.map((chip) => (
      <Badge key={chip} className="rounded-full border border-slate-200/80 bg-white/88 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
        {chip}
      </Badge>
    ))}
  </div>
);

export const DashboardRail = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.86fr)]", className)}>{children}</div>
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
  <Card className={cn("overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/94 shadow-[0_18px_40px_rgba(15,23,42,0.05)]", className)}>
    <CardContent className="space-y-3 p-5">
      <div className="h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,rgba(37,99,235,0.92),rgba(59,130,246,0.35))]" />
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
  <Card className={cn("rounded-[24px] border border-slate-200/80 bg-white/94 shadow-sm", className)}>
    <CardContent className="space-y-3 p-6">
      <div className="space-y-1">
        <p className="text-base font-semibold tracking-tight text-slate-950">{title}</p>
        {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </CardContent>
  </Card>
);
