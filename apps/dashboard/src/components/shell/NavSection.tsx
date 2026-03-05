"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileText,
  Home,
  Landmark,
  LineChart,
  ListChecks,
  Lock,
  MessageSquare,
  RefreshCw,
  Shield,
  Sparkles,
  Timer,
  User,
  Users,
  Wallet
} from "lucide-react";
import type { NavigationItem } from "@/navigation/navigation.config";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  user: User,
  users: Users,
  clock: Clock3,
  calendar: CalendarDays,
  check: CheckCircle2,
  team: Users,
  shift: Clock3,
  swap: RefreshCw,
  leave: CalendarDays,
  wallet: Wallet,
  bank: Landmark,
  book: BookOpen,
  note: FileText,
  chat: MessageSquare,
  bell: Bell,
  approve: ClipboardCheck,
  time: Timer,
  checklist: ListChecks,
  payroll: Wallet,
  billing: CreditCard,
  org: Building2,
  chart: LineChart,
  feedback: MessageSquare,
  spark: Sparkles,
  shield: Shield,
  lock: Lock
};

export const NavSection = ({
  items,
  collapsed,
  onNavigate
}: {
  items: NavigationItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const prefetchTargets = items.slice(0, 8);

  React.useEffect(() => {
    for (const item of prefetchTargets) {
      router.prefetch(item.href);
    }
  }, [router, prefetchTargets]);


  if (items.length === 0) {
    return <EmptyState title="No modules enabled" subtitle="Your current plan does not expose tenant modules." compact />;
  }

  return (
    <nav className="nav-section" aria-label="Primary navigation">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = ICONS[item.icon] ?? Home;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "nav-section__item",
              collapsed && "nav-section__item--collapsed",
              isActive ? "nav-section__item--active" : "nav-section__item--idle"
            )}
            aria-current={isActive ? "page" : undefined}
            prefetch
            title={collapsed ? item.label : undefined}
            onMouseEnter={() => router.prefetch(item.href)}
            onClick={onNavigate}
          >
            <span className="nav-section__icon-wrap">
              <Icon
                className={cn(
                  "nav-section__icon",
                  isActive ? "nav-section__icon--active" : "nav-section__icon--idle"
                )}
                aria-hidden="true"
              />
            </span>
            {!collapsed ? <span className="nav-section__label">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
};
