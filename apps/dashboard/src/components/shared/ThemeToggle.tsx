"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const THEME_KEY = "lf-theme";

type ThemeMode = "light" | "dark";

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeToggle = () => {
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

  return (
    <button
      className="inline-flex h-[38px] items-center gap-3 rounded-full border border-slate-200/80 bg-white/90 px-3 text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
      type="button"
      role="switch"
      aria-checked={theme === "dark"}
      aria-label="Toggle dark mode"
      onClick={toggle}
    >
      <span className="text-sm font-semibold">Dark mode</span>
      <span
        className={cn(
          "relative flex h-6 w-12 items-center rounded-full border transition duration-150",
          theme === "dark"
            ? "border-blue-400/40 bg-slate-900 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
            : "border-slate-300 bg-slate-200"
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute h-[18px] w-[18px] rounded-full shadow-[0_6px_14px_rgba(15,23,42,0.24)] transition-transform duration-150",
            theme === "dark" ? "translate-x-7 bg-white" : "translate-x-1 bg-slate-900"
          )}
        />
      </span>
    </button>
  );
};

