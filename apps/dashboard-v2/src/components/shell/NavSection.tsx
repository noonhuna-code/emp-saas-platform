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
            <div className="flex items-center gap-3 px-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400/80">
                {group.label}
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
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
                    "group flex items-center gap-3 rounded-[1.15rem] border px-3 py-3 text-sm transition-all duration-150 ease-out",
                    collapsed ? "justify-center px-0" : "",
                    active
                      ? "border-sky-300/24 bg-[linear-gradient(180deg,rgba(59,130,246,0.26),rgba(37,99,235,0.14))] text-white shadow-[0_16px_34px_rgba(2,6,23,0.28)] ring-1 ring-sky-300/10"
                      : "border-transparent bg-white/[0.015] text-slate-300 hover:border-white/8 hover:bg-white/[0.05] hover:text-white hover:translate-x-[2px]"
                  )}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-150",
                      active
                        ? "border-white/12 bg-white/[0.12] text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "border-white/6 bg-white/[0.035] text-slate-400 group-hover:border-white/10 group-hover:bg-white/[0.08] group-hover:text-slate-100"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                  </span>
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
