import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "[data-theme='dark']"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/navigation/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      colors: {
        background: "var(--bg)",
        foreground: "var(--ink)",
        border: "var(--line)",
        card: "var(--panel)",
        brand: {
          50: "#ecf3ff",
          200: "#cdddff",
          300: "#9fc2ff",
          400: "#759dff",
          500: "#465fff",
          600: "#3641f5",
          700: "#2a31c8",
          800: "#252da0"
        },
        muted: {
          DEFAULT: "var(--panel-strong)",
          foreground: "var(--muted)"
        },
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-ink)"
        }
      },
      boxShadow: {
        app: "var(--shadow)",
        "theme-xs": "0px 1px 2px 0px rgba(16, 24, 40, 0.05)",
        "theme-sm": "0px 1px 3px 0px rgba(16, 24, 40, 0.1), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)",
        "theme-md": "0px 4px 6px -2px rgba(16, 24, 40, 0.03), 0px 12px 16px -4px rgba(16, 24, 40, 0.08)"
      },
      fontFamily: {
        body: "var(--font-body)",
        head: "var(--font-head)"
      }
    }
  },
  plugins: []
};

export default config;
