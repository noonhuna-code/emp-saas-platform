"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BellDot,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
  ChartColumnBig,
  Clock3,
  Home,
  MessageSquare,
  NotebookTabs,
  ReceiptText,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prewarmRouteData } from "@/lib/client/api";
import type { NavigationGroup } from "@/navigation/navigation.config";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  profile: UserRound,
  employees: Users,
  org: Building2,
  attendance: Clock3,
  leave: CalendarRange,
  payroll: WalletCards,
  projects: BriefcaseBusiness,
  chat: MessageSquare,
  resources: BookOpenText,
  analytics: ChartColumnBig,
  settings: Settings2,
  notifications: BellDot,
  notes: NotebookTabs,
  approvals: BadgeCheck,
  billing: ReceiptText,
  monitoring: ShieldCheck
};

const pickIcon = (iconKey?: string | null) => ICONS[iconKey ?? ""] ?? Home;

export const NavSection = ({
  groups,
  collapsed,
  onNavigate
}: {
  groups: NavigationGroup[];
  collapsed: boolean;
  onNavigate?: () => void;
}) => {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.id} className="space-y-2">
          {!collapsed ? (
            <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              {group.label}
            </div>
          ) : null}
          <div className="space-y-1.5">
            {group.items.map((item) => {
              const Icon = pickIcon(item.icon);
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => prewarmRouteData(item.href)}
                  onFocus={() => prewarmRouteData(item.href)}
                  onClick={() => {
                    router.prefetch(item.href);
                    onNavigate?.();
                  }}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition-all duration-150 ease-out",
                    collapsed ? "justify-center px-0" : "",
                    active
                      ? "border-blue-400/40 bg-blue-500/18 text-white shadow-[0_16px_36px_rgba(37,99,235,0.24)]"
                      : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                  )}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-blue-200" : "text-slate-400 group-hover:text-slate-100")} />
                  {!collapsed ? <span className="truncate font-medium leading-none">{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
