import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EMP OS V2",
    template: "%s · EMP OS V2"
  },
  description: "Parallel dashboard-v2 frontend for EMP OS using the existing workforce backend contracts."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const key = 'emp-v2-theme'; const stored = localStorage.getItem(key); if (stored === 'light' || stored === 'dark') { document.documentElement.setAttribute('data-theme', stored); return; } const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light'); } catch (e) {} })();`
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
