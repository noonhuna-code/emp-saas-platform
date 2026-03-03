"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  if (items.length === 0) {
    return <EmptyState title="No modules enabled" subtitle="Your current plan does not expose tenant modules." compact />;
  }

  return (
    <nav className="grid gap-1.5" aria-label="Primary navigation">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = ICONS[item.icon] ?? Home;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
              collapsed && "justify-center px-2",
              isActive
                ? "border-white/25 bg-white/12 text-white"
                : "border-transparent text-indigo-100/90 hover:border-white/15 hover:bg-white/8 hover:text-white"
            )}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
          >
            <Icon size={16} className={cn("shrink-0", isActive ? "text-white" : "text-indigo-100/80 group-hover:text-white")} />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
};
