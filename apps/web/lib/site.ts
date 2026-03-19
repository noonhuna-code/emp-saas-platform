export const siteConfig = {
  name: "EMP Workforce OS",
  shortName: "EMP",
  title: "Workforce OS for modern teams",
  description:
    "EMP is a connected Workforce OS for companies that need structure, approvals, attendance, leave, payroll visibility, collaboration, and executive insight in one place.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.empworkforceos.com",
  ogImage: "/opengraph-image",
  email: "contact@empworkforceos.com",
  nav: [
    { href: "/product", label: "Product" },
    { href: "/modules", label: "Modules" },
    { href: "/pricing", label: "Pricing" },
    { href: "/security", label: "Security" },
    { href: "/docs", label: "Docs" },
    { href: "/contact", label: "Book Demo" }
  ],
  footerNav: [
    {
      title: "Platform",
      links: [
        { href: "/product", label: "Product overview" },
        { href: "/modules", label: "Module breakdown" },
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
      title: "Support",
      links: [
        { href: "/contact", label: "Book demo" },
        { href: "/docs", label: "Docs and help" },
        { href: "/security", label: "Security" }
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
        { href: "/contact", label: "Book demo" }
      ]
    }
  ],
  footerMetaLinks: [
    { href: "/privacy-policy", label: "Privacy" },
    { href: "/terms-of-service", label: "Terms" },
    { href: "/security", label: "Security" },
    { href: "/docs", label: "Docs" }
  ],
  trustBadges: [
    "Launch-ready legal structure",
    "Analytics placeholder integration points",
    "CRM-ready demo flow"
  ]
} as const;

export type NavItem = (typeof siteConfig.nav)[number];
