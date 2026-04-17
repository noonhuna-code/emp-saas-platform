"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrganizationCapabilities } from "./organization-access";

const NAV_ITEMS = [
  { href: "/app/organization", label: "Organization" },
  { href: "/app/people", label: "People" },
  { href: "/app/org-chart", label: "Org chart" },
] as const;

export function OrganizationSectionNav({
  capabilities,
  className,
}: {
  capabilities: OrganizationCapabilities;
  className?: string;
}) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter((item) => {
    if (item.href === "/app/organization") return capabilities.canReadOrganization;
    if (item.href === "/app/people") return capabilities.canViewPeople;
    if (item.href === "/app/org-chart") return capabilities.canViewOrgChart;
    return false;
  });

  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition",
              active
                ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            )}
            href={item.href}
          >
            {item.label}
          </Link>
        );
      })}
      {capabilities.canReadOrganization ? (
        <Link
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition",
            pathname === "/app/dashboard"
              ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
          )}
          href="/app/dashboard"
        >
          Dashboard
        </Link>
      ) : null}
      <Badge className="rounded-full border-slate-200 bg-white/90 text-slate-700">
        {capabilities.roleLabel}
      </Badge>
      {capabilities.isReadOnly ? (
        <Badge className="rounded-full border-amber-200 bg-amber-50 text-amber-700">Read only</Badge>
      ) : null}
    </div>
  );
}
