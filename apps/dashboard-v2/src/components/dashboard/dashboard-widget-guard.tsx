"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import {
  canRenderWidget,
  type DashboardWidget,
  type DashboardWidgetCapability
} from "@/lib/dashboard/dashboard-widget-capabilities";

const DashboardWidgetCapabilitiesContext = createContext<DashboardWidgetCapability[] | null>(null);

export const DashboardWidgetCapabilitiesProvider = ({
  userCapabilities,
  children
}: {
  userCapabilities: DashboardWidgetCapability[];
  children: ReactNode;
}) => {
  return (
    <DashboardWidgetCapabilitiesContext.Provider value={userCapabilities}>
      {children}
    </DashboardWidgetCapabilitiesContext.Provider>
  );
};

export type DashboardWidgetGuardProps = {
  widget: DashboardWidget;
  children: ReactNode;
  fallback?: ReactNode;
};

export const DashboardWidgetGuard = ({
  widget,
  children,
  fallback = null
}: DashboardWidgetGuardProps) => {
  const userCapabilities = useContext(DashboardWidgetCapabilitiesContext) ?? [];
  const allowed = canRenderWidget(userCapabilities, widget);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

