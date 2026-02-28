import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EMP OS",
    template: "%s · EMP OS"
  },
  description: "Enterprise workforce management suite for HR, attendance, leave, and governance."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const key = 'lf-theme'; const stored = localStorage.getItem(key); if (stored === 'light' || stored === 'dark') { document.documentElement.setAttribute('data-theme', stored); return; } const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light'); } catch (e) {} })();`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
