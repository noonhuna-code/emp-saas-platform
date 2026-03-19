export const siteConfig = {
  name: "EMP Workforce OS",
  shortName: "EMP",
  title: "Employee operations and approvals",
  description:
    "EMP helps teams manage employee records, reporting lines, leave approvals, attendance exceptions, payroll visibility, admin controls, and workforce analytics in one place.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.empworkforceos.com",
  ogImage: "/opengraph-image",
  email: "noonhuna@gmail.com",
  founder: {
    name: "Umair",
    title: "Founder, EMP",
    email: "noonhuna@gmail.com",
    image: "/founder/umair.png"
  },
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
    "Founder-led support",
    "Security review available",
    "Guided demos"
  ]
} as const;

export type NavItem = (typeof siteConfig.nav)[number];
