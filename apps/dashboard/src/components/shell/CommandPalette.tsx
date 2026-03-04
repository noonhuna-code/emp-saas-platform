"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";

export type CommandItem = {
  label: string;
  href: string;
  section: string;
  personas: DashboardPersona[];
};

const COMMANDS: CommandItem[] = [
  { label: "Open Dashboard", href: "/app/dashboard", section: "Employee", personas: ["employee"] },
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

  { label: "View Payroll", href: "/app/payroll", section: "Finance", personas: ["hr", "admin"] },
  { label: "Generate Payslips", href: "/app/payroll", section: "Finance", personas: ["hr", "admin"] },
  { label: "Export Salary Data", href: "/app/payroll", section: "Finance", personas: ["hr", "admin"] },

  { label: "Open Tenants", href: "/platform", section: "Platform Owner", personas: ["platform_owner"] },
  { label: "View System Health", href: "/platform", section: "Platform Owner", personas: ["platform_owner"] },
  { label: "View API Usage", href: "/platform", section: "Platform Owner", personas: ["platform_owner"] }
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
    return filtered.filter((item) => item.label.toLowerCase().includes(q));
  }, [persona, query]);

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

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, items, activeIndex, router]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

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
            placeholder="Search commands..."
            className="command-palette__input"
            aria-label="Search commands"
          />
          <span className="command-palette__hint">Esc</span>
        </div>
        <div className="command-palette__list" role="listbox">
          {items.length === 0 ? (
            <div className="command-palette__empty">No matching commands.</div>
          ) : (
            items.map((item, index) => (
              <button
                key={`${item.section}-${item.label}`}
                type="button"
                className={`command-palette__item ${index === activeIndex ? "command-palette__item--active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
              >
                <div className="command-palette__item-text">
                  <span className="command-palette__item-title">{item.label}</span>
                  <span className="command-palette__item-section">{item.section}</span>
                </div>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
        <div className="command-palette__footer">Tip: Ctrl + K</div>
      </div>
    </div>
  );
};
