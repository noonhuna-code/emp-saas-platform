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
        app: "var(--shadow)"
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
