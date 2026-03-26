"use client";

import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_KEY = "emp-v2-theme";

type ThemeMode = "light" | "dark";

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeToggle = ({ compact = false }: { compact?: boolean }) => {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggle = () => {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(THEME_KEY, next);
  };

  const isDark = theme === "dark";

  if (compact) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Dark mode" : "Light mode"}
        onClick={toggle}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-[16px] border text-slate-700 shadow-sm transition",
          isDark
            ? "border-sky-400/30 bg-sky-500/10 text-sky-700 hover:border-sky-400/50 hover:bg-sky-500/15 dark:text-sky-200"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900"
        )}
      >
        {isDark ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={toggle}
      className="inline-flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/85 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-100"
    >
      <span className="whitespace-nowrap">Dark mode</span>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition duration-150",
          isDark
            ? "border-sky-400/50 bg-sky-500/20 shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
            : "border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800"
        )}
      >
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-full shadow-sm transition duration-150",
            isDark ? "translate-x-[21px] bg-white text-sky-600" : "translate-x-[1px] bg-slate-950 text-white dark:bg-slate-200 dark:text-slate-950"
          )}
        >
          {isDark ? <MoonStar className="h-3 w-3" /> : <SunMedium className="h-3 w-3" />}
        </span>
      </span>
    </button>
  );
};
