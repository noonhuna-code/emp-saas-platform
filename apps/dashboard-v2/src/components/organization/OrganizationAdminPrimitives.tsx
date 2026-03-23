"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const adminInputClassName =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export const adminTextAreaClassName =
  "min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export const adminCheckboxClassName =
  "h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200";

export const AdminField = ({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) => (
  <label className={cn("flex flex-col gap-2", className)}>
    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
    {children}
    {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
  </label>
);

export const AdminGrid = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>{children}</div>
);

export const AdminInlineMessage = ({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "success" | "error";
  children: ReactNode;
}) => {
  const className =
    tone === "success"
      ? "text-emerald-700"
      : tone === "error"
        ? "text-rose-700"
        : "text-slate-600";
  return <div className={cn("text-sm", className)}>{children}</div>;
};

export const AdminTable = ({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
    <table className="min-w-full border-collapse text-sm">
      <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
        <tr>
          {headers.map((header) => (
            <th key={header} className="px-4 py-3 font-semibold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white text-slate-700">{children}</tbody>
    </table>
  </div>
);

export const AdminTabs = ({
  value,
  onChange,
  tabs,
}: {
  value: string;
  onChange: (value: string) => void;
  tabs: Array<{ id: string; label: string }>;
}) => (
  <div className="flex flex-wrap gap-2">
    {tabs.map((tab) => {
      const active = tab.id === value;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition",
            active
              ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
          )}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);
