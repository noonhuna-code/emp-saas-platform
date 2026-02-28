"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  permission?: string;
  permissionsAny?: string[];
  featureKey?: string;
  featureAnyKeys?: string[];
};

export const RoleAwareNav = ({
  items,
  permissions,
  entitlements
}: {
  items: NavItem[];
  permissions: string[];
  entitlements?: Record<string, unknown> | null;
}) => {
  const pathname = usePathname();

  const hasFeature = (key: string): boolean => {
    if (!entitlements) return true;
    return entitlements[key] === true;
  };

  const visibleItems = items.filter((item) => {
    if (!item.permission && (!item.permissionsAny || item.permissionsAny.length === 0)) return true;
    if (item.permission && permissions.includes(item.permission)) return true;
    if (item.permissionsAny && item.permissionsAny.some((p) => permissions.includes(p))) return true;
    return false;
  }).filter((item) => {
    if (item.featureKey && !hasFeature(item.featureKey)) return false;
    if (item.featureAnyKeys && item.featureAnyKeys.length > 0) {
      return item.featureAnyKeys.some((key) => hasFeature(key));
    }
    return true;
  });

  if (visibleItems.length === 0) {
    return (
      <nav className="stack role-aware-nav" aria-label="Primary navigation">
        <span className="sidebar-empty">No modules enabled for this plan.</span>
      </nav>
    );
  }

  return (
    <nav className="stack role-aware-nav" aria-label="Primary navigation">
      {visibleItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={isActive ? "active" : ""} aria-current={isActive ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
