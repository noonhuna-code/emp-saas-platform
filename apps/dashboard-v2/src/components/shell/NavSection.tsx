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
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
                {group.label}
              </div>
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
                    collapsed ? "justify-center px-0 py-3.5" : "py-2.5",
                    active
                      ? "border-brand-200 bg-brand-50 text-brand-700 shadow-theme-xs dark:border-brand-500/20 dark:bg-brand-500/[0.12] dark:text-brand-400"
                      : "border-transparent bg-transparent text-gray-700 hover:border-gray-200 hover:bg-gray-100 dark:text-gray-300 dark:hover:border-gray-800 dark:hover:bg-white/[0.03]"
                  )}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    className={cn(
                      "absolute inset-y-2 left-1.5 hidden w-1 rounded-full transition lg:block",
                      active ? "bg-brand-500" : "bg-transparent"
                    )}
                    aria-hidden="true"
                  />

                  <span
                    className={cn(
                      "ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition",
                      active
                        ? "border-brand-200 bg-white text-brand-600 dark:border-brand-500/20 dark:bg-gray-900 dark:text-brand-400"
                        : "border-gray-200 bg-white text-gray-400 group-hover:border-gray-200 group-hover:bg-white group-hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500 dark:group-hover:border-gray-700 dark:group-hover:bg-gray-900 dark:group-hover:text-gray-300",
                      collapsed ? "ml-0" : ""
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>

                  {!collapsed ? (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.95rem] font-semibold leading-none">{item.label}</span>
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
