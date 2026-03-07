"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Command, Search, Sparkles } from "lucide-react";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";

export type CommandItem = {
  label: string;
  href: string;
  section: string;
  personas: DashboardPersona[];
};

const COMMANDS: CommandItem[] = [
  { label: "Open Dashboard", href: "/app/dashboard", section: "Workspace", personas: ["employee", "finance", "it", "manager", "team_lead", "hr", "admin", "founder"] },
  { label: "Open Attendance", href: "/app/attendance", section: "Employee", personas: ["employee"] },
  { label: "Apply Leave", href: "/app/leave", section: "Employee", personas: ["employee"] },
  { label: "Request Shift Swap", href: "/app/attendance/shift-swaps", section: "Employee", personas: ["employee"] },
  { label: "Open Team Chat", href: "/app/chat", section: "Employee", personas: ["employee"] },
  { label: "Open Calendar", href: "/app/calendar", section: "Employee", personas: ["employee"] },
  { label: "Open Notifications", href: "/app/notifications", section: "Employee", personas: ["employee"] },

  { label: "Open Team Overview", href: "/app/attendance/team", section: "Manager", personas: ["manager", "team_lead"] },
  { label: "Review Leave Requests", href: "/app/leave/review", section: "Manager", personas: ["manager", "team_lead"] },
  { label: "Review Shift Swaps", href: "/app/attendance/shift-swaps", section: "Manager", personas: ["manager", "team_lead"] },
  { label: "Open Reports", href: "/app/monitoring", section: "Manager", personas: ["manager", "team_lead"] },

  { label: "Add Employee", href: "/app/employees", section: "HR", personas: ["hr", "admin"] },
  { label: "Manage Policies", href: "/app/resources", section: "HR", personas: ["hr", "admin"] },
  { label: "View Workforce", href: "/app/employees", section: "HR", personas: ["hr", "admin"] },

  { label: "View Payroll", href: "/app/payroll", section: "Finance", personas: ["finance", "hr", "admin", "founder"] },
  { label: "Generate Payslips", href: "/app/payroll", section: "Finance", personas: ["finance", "hr", "admin", "founder"] },
  { label: "Export Salary Data", href: "/app/payslips", section: "Finance", personas: ["finance", "hr", "admin", "founder"] },
  { label: "Open Billing Console", href: "/app/billing", section: "Finance", personas: ["finance", "admin", "founder"] },

  { label: "Open Monitoring", href: "/app/monitoring", section: "IT", personas: ["it", "admin", "founder"] },
  { label: "View Security Events", href: "/app/monitoring", section: "IT", personas: ["it", "admin", "founder"] },
  { label: "Open System Notifications", href: "/app/notifications", section: "IT", personas: ["it"] },

  { label: "Open Executive Overview", href: "/dashboard/founder", section: "Founder", personas: ["founder"] },
  { label: "View System Health", href: "/app/monitoring", section: "Founder", personas: ["founder"] },

  { label: "Open Tenants", href: "/platform", section: "Platform", personas: ["platform_owner"] },
  { label: "View Global Audit", href: "/platform", section: "Platform", personas: ["platform_owner"] },
  { label: "View API Usage", href: "/platform", section: "Platform", personas: ["platform_owner"] }
];

export const CommandPalette = ({ persona }: { persona: DashboardPersona }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = COMMANDS.filter((item) => item.personas.includes(persona));
    if (!q) return filtered;
    return filtered.filter((item) => `${item.label} ${item.section} ${item.href}`.toLowerCase().includes(q));
  }, [persona, query]);

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
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="command-palette__backdrop" role="dialog" aria-modal="true">
      <div className="command-palette">
        <div className="command-palette__header">
          <div className="command-palette__icon">
            <Search className="h-4 w-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people, workflows, and actions"
            className="command-palette__input"
            aria-label="Search commands"
          />
          <span className="command-palette__hint"><Command className="h-3 w-3" />K</span>
        </div>
        <div className="command-palette__list" role="listbox">
          {groupedItems.length === 0 ? (
            <div className="command-palette__empty">No matching commands.</div>
          ) : (
            groupedItems.map(([section, sectionItems]) => (
              <div key={section} className="command-palette__group">
                <div className="command-palette__group-label">{section}</div>
                {sectionItems.map((item) => {
                  flatIndex += 1;
                  const isActive = flatIndex === activeIndex;
                  return (
                    <button
                      key={`${item.section}-${item.label}`}
                      type="button"
                      className={`command-palette__item ${isActive ? "command-palette__item--active" : ""}`}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                      onClick={() => {
                        setOpen(false);
                        router.push(item.href);
                      }}
                    >
                      <div className="command-palette__item-text">
                        <span className="command-palette__item-title">{item.label}</span>
                        <span className="command-palette__item-section">{item.href}</span>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="command-palette__footer">
          <span className="command-palette__footer-chip">
            <Sparkles className="h-3.5 w-3.5" />
            Instant navigation
          </span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
