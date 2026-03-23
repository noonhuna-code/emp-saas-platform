"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BadgeCheck,
  BellDot,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CalendarRange,
  ChartColumnBig,
  CircleDollarSign,
  Clock3,
  HandCoins,
  Home,
  MessageSquare,
  MessageSquareHeart,
  Network,
  NotebookTabs,
  ReceiptText,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Timer,
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
  user: UserRound,
  users: Users,
  network: Network,
  "clock-3": Clock3,
  "calendar-range": CalendarRange,
  "calendar-days": CalendarDays,
  timer: Timer,
  "hand-coins": HandCoins,
  "scroll-text": ScrollText,
  "wallet-cards": WalletCards,
  "briefcase-business": BriefcaseBusiness,
  "messages-square": MessageSquare,
  "book-open-text": BookOpenText,
  "chart-column-big": ChartColumnBig,
  sparkles: Sparkles,
  activity: Activity,
  "message-square-heart": MessageSquareHeart,
  "settings-2": Settings2,
  "bell-dot": BellDot,
  "notebook-tabs": NotebookTabs,
  "badge-check": BadgeCheck,
  "receipt-text": ReceiptText,
  "shield-check": ShieldCheck,
  org: Building2,
  payroll: CircleDollarSign,
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
        <section key={group.id} className="space-y-3">
          {!collapsed ? (
            <div className="px-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-100/45">
                {group.label}
              </div>
              {group.description ? (
                <p className="mt-1 text-[12px] leading-5 text-slate-400/85">{group.description}</p>
              ) : null}
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
                    "group relative flex items-center gap-3 overflow-hidden rounded-[1.1rem] border px-3 py-3 text-sm transition-all duration-150 ease-out",
                    collapsed ? "justify-center px-0 py-3.5" : "",
                    active
                      ? "border-sky-400/25 bg-[linear-gradient(135deg,rgba(37,99,235,0.22),rgba(15,23,42,0.82))] text-white shadow-[0_16px_34px_rgba(2,6,23,0.24)]"
                      : "border-transparent bg-transparent text-slate-300 hover:border-sky-300/12 hover:bg-white/[0.055] hover:text-white"
                  )}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    className={cn(
                      "absolute inset-y-2 left-1.5 hidden w-1 rounded-full transition lg:block",
                      active ? "bg-sky-300/85 shadow-[0_0_12px_rgba(125,211,252,0.55)]" : "bg-transparent"
                    )}
                    aria-hidden="true"
                  />

                  <span
                    className={cn(
                      "ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition",
                      active
                        ? "border-sky-300/18 bg-white/12 text-sky-100"
                        : "border-white/6 bg-white/[0.04] text-slate-400 group-hover:border-white/10 group-hover:bg-white/[0.07] group-hover:text-slate-100",
                      collapsed ? "ml-0" : ""
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>

                  {!collapsed ? (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.95rem] font-semibold leading-none">{item.label}</span>
                      {item.description ? (
                        <span
                          className={cn(
                            "mt-1 block truncate text-[11px] leading-5",
                            active ? "text-sky-100/82" : "text-slate-400 group-hover:text-slate-300"
                          )}
                        >
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
