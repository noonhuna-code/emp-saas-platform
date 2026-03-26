"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Command, Search, Sparkles } from "lucide-react";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";
import { TENANT_NAVIGATION_GROUPS, resolveVisibleNavigationGroups } from "@/navigation/navigation.config";

export type CommandItem = {
  label: string;
  href: string;
  section: string;
  personas: DashboardPersona[];
};

const COMMANDS: CommandItem[] = [
  { label: "Open Home", href: "/app/dashboard", section: "Workspace", personas: ["employee", "manager", "admin_ops", "finance", "executive"] },
  { label: "Open Attendance", href: "/app/attendance", section: "Workforce", personas: ["employee", "manager", "admin_ops", "finance", "executive"] },
  { label: "Request Leave", href: "/app/leave", section: "Workforce", personas: ["employee", "manager", "admin_ops", "finance", "executive"] },
  { label: "Open People", href: "/app/employees", section: "Workforce", personas: ["manager", "admin_ops", "finance", "executive"] },
  { label: "Open Organization", href: "/app/organization", section: "Workforce", personas: ["manager", "admin_ops", "finance", "executive"] },
  { label: "Open Payroll", href: "/app/payroll", section: "Operations", personas: ["admin_ops", "finance", "executive"] },
  { label: "Open Projects", href: "/app/projects", section: "Operations", personas: ["manager", "admin_ops", "executive"] },
  { label: "Open Chat", href: "/app/chat", section: "Collaboration", personas: ["employee", "manager", "admin_ops", "finance", "executive"] },
  { label: "Open Knowledge Base", href: "/app/resources", section: "Collaboration", personas: ["employee", "manager", "admin_ops", "finance", "executive"] },
  { label: "Open Notifications", href: "/app/notifications", section: "Collaboration", personas: ["employee", "manager", "admin_ops", "finance", "executive"] },
  { label: "Open Analytics", href: "/app/analytics", section: "Insights", personas: ["manager", "admin_ops", "finance", "executive"] },
  { label: "Open Settings", href: "/app/settings", section: "Platform", personas: ["employee", "manager", "admin_ops", "finance", "executive"] },
  { label: "Open Monitoring", href: "/app/monitoring", section: "Platform", personas: ["admin_ops", "executive"] },
  { label: "Open Billing", href: "/app/billing", section: "Platform", personas: ["finance", "admin_ops", "executive"] },
  { label: "Open Tenants", href: "/platform", section: "Platform", personas: ["platform_owner"] }
];

export const CommandPalette = ({
  persona,
  permissions,
  hasEmployeeContext,
  entitlements,
}: {
  persona: DashboardPersona;
  permissions?: string[];
  hasEmployeeContext?: boolean;
  entitlements?: Record<string, unknown> | null;
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const tenantAllowedRoutes = useMemo(() => {
    if (!permissions) return null;
    const visibleGroups = resolveVisibleNavigationGroups(TENANT_NAVIGATION_GROUPS, {
      permissions,
      hasEmployeeContext: Boolean(hasEmployeeContext),
      entitlements: entitlements ?? null,
      persona,
    });
    return new Set(visibleGroups.flatMap((group) => group.items.map((item) => item.href)));
  }, [entitlements, hasEmployeeContext, permissions, persona]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = COMMANDS.filter((item) => {
      if (!item.personas.includes(persona)) return false;
      if (!tenantAllowedRoutes) return true;
      if (item.href === "/platform") return persona === "platform_owner";
      return tenantAllowedRoutes.has(item.href);
    });
    if (!q) return filtered;
    return filtered.filter((item) => `${item.label} ${item.section} ${item.href}`.toLowerCase().includes(q));
  }, [persona, query, tenantAllowedRoutes]);

  const groupedItems = useMemo(() => {
    const buckets = new Map<string, CommandItem[]>();
    for (const item of items) {
      const bucket = buckets.get(item.section) ?? [];
      bucket.push(item);
      buckets.set(item.section, bucket);
    }
    return Array.from(buckets.entries());
  }, [items]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isK = event.key.toLowerCase() === "k";
      if ((event.ctrlKey || event.metaKey) && isK) {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(items.length - 1, 0)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const target = items[activeIndex];
        if (target) {
          setOpen(false);
          router.push(target.href);
        }
      }
    };

    const onPaletteToggle = () => setOpen((prev) => !prev);
    const onPaletteOpen = () => setOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("emp.commandPalette.toggle", onPaletteToggle as EventListener);
    window.addEventListener("emp.commandPalette.open", onPaletteOpen as EventListener);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("emp.commandPalette.toggle", onPaletteToggle as EventListener);
      window.removeEventListener("emp.commandPalette.open", onPaletteOpen as EventListener);
    };
  }, [open, items, activeIndex, router]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto mt-20 w-full max-w-[40rem] px-4 sm:mt-24">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-2xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="rounded-full border border-slate-200 bg-slate-100 p-2 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people, workflows, and actions"
              className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-100"
              aria-label="Search commands"
            />
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <Command className="h-3 w-3" />K
            </span>
          </div>
          <div className="max-h-[28rem] overflow-y-auto px-3 py-3">
            {groupedItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                No matching commands.
              </div>
            ) : (
              <div className="space-y-4">
                {groupedItems.map(([section, sectionItems]) => (
                  <div key={section} className="space-y-2">
                    <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">{section}</div>
                    <div className="space-y-1">
                      {sectionItems.map((item) => {
                        flatIndex += 1;
                        const isActive = flatIndex === activeIndex;
                        return (
                          <button
                            key={`${item.section}-${item.label}`}
                            type="button"
                            className={isActive
                              ? "flex w-full items-center justify-between rounded-2xl bg-sky-50 px-4 py-3 text-left dark:bg-sky-500/10"
                              : "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-slate-900"
                            }
                            onMouseEnter={() => setActiveIndex(flatIndex)}
                            onClick={() => {
                              setOpen(false);
                              router.push(item.href);
                            }}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</div>
                              <div className="truncate text-xs text-slate-500 dark:text-slate-400">{item.href}</div>
                            </div>
                            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-900">
              <Sparkles className="h-3.5 w-3.5" />Instant navigation
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <span>Esc to close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

