import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

const routes = [
  "/",
  "/product",
  "/modules",
  "/integrations",
  "/pricing",
  "/security",
  "/demo",
  "/docs",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/employee-management-software",
  "/attendance-management-software",
  "/leave-management-system",
  "/payroll-management-software",
  "/employee-directory-software",
  "/workforce-analytics-software"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: route === "/" ? siteConfig.url : `${siteConfig.url}${route}`,
    lastModified,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.8
  }));
}
