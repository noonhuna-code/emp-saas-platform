const normalizeAbsoluteUrl = (value: string | undefined | null): string | null => {
  const raw = value?.trim();
  if (!raw) return null;
  return raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
};

const siteUrl =
  normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
  normalizeAbsoluteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  normalizeAbsoluteUrl(process.env.VERCEL_URL) ??
  "https://emp-marketing-site.vercel.app";

const dashboardUrl =
  normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_DASHBOARD_URL) ??
  "https://dashboard-one-ecru-83.vercel.app";

export const siteConfig = {
  name: "EMP Workforce OS",
  shortName: "EMP",
  title: "Employee operations and approvals",
  description:
    "EMP helps teams manage employee records, reporting lines, leave approvals, attendance exceptions, payroll visibility, admin controls, and workforce analytics in one place.",
  url: siteUrl,
  dashboardUrl,
  ogImage: "/opengraph-image",
  email: "noonhuna@gmail.com",
  founder: {
    name: "Muhammad Umair",
    title: "Founder, EMP",
    email: "noonhuna@gmail.com",
    phone: "03106598623",
    image: "/founder/umair.png"
  },
  nav: [
    { href: "/product", label: "Product" },
    { href: "/modules", label: "Modules" },
    { href: "/integrations", label: "Integrations" },
    { href: "/pricing", label: "Pricing" },
    { href: "/security", label: "Security" }
  ],
  footerNav: [
    {
      title: "Platform",
      links: [
        { href: "/product", label: "Product overview" },
        { href: "/modules", label: "Module breakdown" },
        { href: "/integrations", label: "Integrations" },
        { href: "/pricing", label: "Pricing approach" },
        { href: "/employee-management-software", label: "Employee management guide" }
      ]
    },
    {
      title: "Solutions",
      links: [
        { href: "/attendance-management-software", label: "Attendance management" },
        { href: "/leave-management-system", label: "Leave management" },
        { href: "/payroll-management-software", label: "Payroll management" },
        { href: "/employee-directory-software", label: "Employee directory" },
        { href: "/workforce-analytics-software", label: "Workforce analytics" }
      ]
    },
    {
      title: "Company",
      links: [
        { href: "/company", label: "Why EMP exists" },
        { href: "/demo", label: "Book demo" },
        { href: "/contact", label: "Contact" },
        { href: "/docs", label: "Docs and help" }
      ]
    },
    {
      title: "Trust",
      links: [
        { href: "/security", label: "Security" },
        { href: "/privacy-policy", label: "Privacy policy" },
        { href: "/terms-of-service", label: "Terms of service" }
      ]
    },
    {
      title: "Access",
      links: [
        { href: "/sign-in", label: "Sign in" },
        { href: "/sign-up", label: "Sign up" },
        { href: "/demo", label: "Book demo" }
      ]
    }
  ],
  footerMetaLinks: [
    { href: "/company", label: "Company" },
    { href: "/privacy-policy", label: "Privacy" },
    { href: "/terms-of-service", label: "Terms" },
    { href: "/security", label: "Security" },
    { href: "/docs", label: "Docs" }
  ],
  trustBadges: [
    "Founder-led product",
    "Guided rollout reviews",
    "Security conversations available"
  ]
} as const;

export type NavItem = (typeof siteConfig.nav)[number];

export function buildDashboardUrl(path = "/app/dashboard") {
  const safePath = path.startsWith("/") ? path : "/app/dashboard";
  return `${siteConfig.dashboardUrl}${safePath}`;
}

export function buildDashboardLoginUrl(next = "/app/dashboard") {
  const safeNext = next.startsWith("/") ? next : "/app/dashboard";
  return `${siteConfig.dashboardUrl}/login?next=${encodeURIComponent(safeNext)}`;
}

export function buildDashboardAuthActionUrl(path = "/api/auth/login") {
  const safePath = path.startsWith("/") ? path : "/api/auth/login";
  return `${siteConfig.dashboardUrl}${safePath}`;
}
