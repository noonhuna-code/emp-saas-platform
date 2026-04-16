"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock3, Command, Search, Sparkles } from "lucide-react";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";
import { TENANT_NAVIGATION_GROUPS, resolveVisibleNavigationGroups, type NavigationGroup } from "@/navigation/navigation.config";

export type CommandItem = {
  label: string;
  href: string;
  section: string;
  description?: string;
  meta?: string;
  priority?: number;
};

const RECENT_ROUTES_STORAGE_KEY = "emp-v2.recent-routes";

const PRIORITY_ROUTES = new Set([
  "/app/dashboard",
  "/app/profile",
  "/app/approvals",
  "/app/attendance",
  "/app/leave",
  "/app/payroll",
  "/app/billing",
  "/app/monitoring",
  "/platform"
]);

const compareCommandItems = (a: CommandItem, b: CommandItem) =>
  (b.priority ?? 0) - (a.priority ?? 0) || a.label.localeCompare(b.label);

const mapGroupCommands = (groups: NavigationGroup[]): CommandItem[] =>
  groups.flatMap((group) =>
    group.items.map((item) => ({
      label: item.label,
      href: item.href,
      section: group.label,
      description: item.description,
      priority: PRIORITY_ROUTES.has(item.href) ? 2 : 1,
    }))
  );

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
  const [recentRoutes, setRecentRoutes] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const visibleGroups = useMemo(() => {
    if (!permissions) return [];
    return resolveVisibleNavigationGroups(TENANT_NAVIGATION_GROUPS, {
      permissions,
      hasEmployeeContext: Boolean(hasEmployeeContext),
      entitlements: entitlements ?? null,
      persona,
    });
  }, [entitlements, hasEmployeeContext, permissions, persona]);
  const tenantAllowedRoutes = useMemo(
    () => new Set(visibleGroups.flatMap((group) => group.items.map((item) => item.href))),
    [visibleGroups]
  );
  const baseItems = useMemo(() => {
    if (persona === "platform_owner") {
      return [
        {
          label: "Platform overview",
          href: "/platform",
          section: "Platform",
          description: "Cross-tenant governance, monitoring, and billing controls.",
          priority: 3,
        },
      ] satisfies CommandItem[];
    }

    return mapGroupCommands(visibleGroups);
  }, [persona, visibleGroups]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const recentItems = recentRoutes
      .map((href) => baseItems.find((item) => item.href === href))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => ({ ...item, section: "Recent", meta: "Recently opened", priority: 4 }));

    const shortcutItems = [
      baseItems.find((item) => item.href === "/app/dashboard"),
      baseItems.find((item) => item.href === "/app/profile"),
      baseItems.find((item) => item.href === "/app/approvals"),
      baseItems.find((item) => item.href === "/app/monitoring"),
      baseItems.find((item) => item.href === "/app/billing"),
      baseItems.find((item) => item.href === "/platform"),
    ]
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => ({ ...item, section: "Shortcuts", meta: "Pinned workspace route", priority: 5 }));

    const merged = [...recentItems, ...shortcutItems, ...baseItems]
      .filter((item, index, collection) => collection.findIndex((entry) => `${entry.section}:${entry.href}` === `${item.section}:${item.href}`) === index);

    if (!q) {
      return merged.sort(compareCommandItems);
    }

    return merged
      .filter((item) =>
        `${item.label} ${item.section} ${item.description ?? ""} ${item.href}`.toLowerCase().includes(q)
      )
      .sort(compareCommandItems);
  }, [baseItems, query, recentRoutes]);

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
    const loadRecentRoutes = () => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(RECENT_ROUTES_STORAGE_KEY) ?? "[]");
        const routes = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
        setRecentRoutes(routes.filter((href) => tenantAllowedRoutes.has(href) || href === "/platform"));
      } catch {
        setRecentRoutes([]);
      }
    };

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
    const onPaletteOpen = () => {
      loadRecentRoutes();
      setOpen(true);
    };
    const onHistoryUpdated = () => loadRecentRoutes();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("emp.commandPalette.toggle", onPaletteToggle as EventListener);
    window.addEventListener("emp.commandPalette.open", onPaletteOpen as EventListener);
    window.addEventListener("emp.commandPalette.historyUpdated", onHistoryUpdated as EventListener);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("emp.commandPalette.toggle", onPaletteToggle as EventListener);
      window.removeEventListener("emp.commandPalette.open", onPaletteOpen as EventListener);
      window.removeEventListener("emp.commandPalette.historyUpdated", onHistoryUpdated as EventListener);
    };
  }, [activeIndex, items, open, router, tenantAllowedRoutes]);

  useEffect(() => {
    if (!open) return;

    try {
      const parsed = JSON.parse(window.localStorage.getItem(RECENT_ROUTES_STORAGE_KEY) ?? "[]");
      const routes = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
      setRecentRoutes(routes.filter((href) => tenantAllowedRoutes.has(href) || href === "/platform"));
    } catch {
      setRecentRoutes([]);
    }

    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, tenantAllowedRoutes]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => setOpen(false)}
    >
      <div className="mx-auto mt-20 w-full max-w-[40rem] px-4 sm:mt-24">
        <div
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-2xl dark:border-slate-800 dark:bg-slate-950/95"
          onClick={(event) => event.stopPropagation()}
        >
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
                              <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {item.description ?? item.meta ?? item.href}
                              </div>
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
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em]">
              <span className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-900 sm:inline-flex">
                <Clock3 className="h-3.5 w-3.5" />
                Recent routes
              </span>
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

