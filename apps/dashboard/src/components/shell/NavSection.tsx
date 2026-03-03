"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/navigation/navigation.config";
import { EmptyState } from "@/components/ui/EmptyState";

const ICON_LABELS: Record<string, string> = {
  home: "🏠",
  user: "👤",
  users: "👥",
  clock: "⏱",
  calendar: "🗓",
  check: "✅",
  team: "🧩",
  shift: "🕒",
  swap: "🔁",
  leave: "🌴",
  wallet: "💳",
  bank: "🏦",
  book: "📘",
  note: "📝",
  chat: "💬",
  bell: "🔔",
  approve: "✔",
  time: "⏲",
  checklist: "📋",
  payroll: "💰",
  billing: "🧾",
  org: "🌳",
  chart: "📈",
  feedback: "🧠",
  spark: "✨",
  shield: "🛡",
  lock: "🔒"
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
    <nav className="nav-section" aria-label="Primary navigation">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-section__item ${isActive ? "nav-section__item--active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
          >
            <span className="nav-section__icon" aria-hidden="true">
              {ICON_LABELS[item.icon] ?? "•"}
            </span>
            {!collapsed ? <span>{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
};
