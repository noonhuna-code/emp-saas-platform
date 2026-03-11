"use client";

import type { ReactNode } from "react";

export const PermissionGate = ({
  allowed,
  fallback = null,
  children
}: {
  allowed: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}) => {
  return <>{allowed ? children : fallback}</>;
};
