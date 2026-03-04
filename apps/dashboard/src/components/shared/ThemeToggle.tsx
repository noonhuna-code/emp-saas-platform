"use client";

import { useEffect, useState } from "react";

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
      className={`theme-toggle ${theme === "dark" ? "theme-toggle--on" : ""}`}
      type="button"
      role="switch"
      aria-checked={theme === "dark"}
      aria-label="Toggle dark mode"
      onClick={toggle}
    >
      <span className="theme-toggle__text">Dark mode</span>
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__thumb" />
      </span>
    </button>
  );
};
