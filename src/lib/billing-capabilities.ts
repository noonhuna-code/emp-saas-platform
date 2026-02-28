import type { AuthContext } from "./types";

export type BillingCapability =
  | "view_billing"
  | "manage_billing"
  | "manage_billing_seats"
  | "manage_billing_subscription"
  | "submit_billing_payment_proof"
  | "approve_billing_payments";

const addMany = (target: Set<BillingCapability>, capabilities: BillingCapability[]) => {
  for (const capability of capabilities) target.add(capability);
};

export const resolveBillingCapabilities = (ctx: AuthContext): Set<BillingCapability> => {
  const capabilities = new Set<BillingCapability>();

  if (ctx.permissions.includes("view_billing")) {
    capabilities.add("view_billing");
    capabilities.add("submit_billing_payment_proof");
  }

  if (ctx.permissions.includes("manage_billing")) {
    addMany(capabilities, [
      "view_billing",
      "manage_billing",
      "manage_billing_seats",
      "manage_billing_subscription",
      "submit_billing_payment_proof"
    ]);
  }

  if (ctx.permissions.includes("manage_company")) {
    addMany(capabilities, [
      "view_billing",
      "manage_billing",
      "manage_billing_seats",
      "manage_billing_subscription",
      "submit_billing_payment_proof"
    ]);
  }

  if (ctx.permissions.includes("approve_billing_payments")) {
    capabilities.add("approve_billing_payments");
  }

  return capabilities;
};

export const hasBillingCapability = (
  ctx: AuthContext,
  capability: BillingCapability
): boolean => resolveBillingCapabilities(ctx).has(capability);

export const requireBillingCapability = (
  ctx: AuthContext,
  capability: BillingCapability
): void => {
  if (!hasBillingCapability(ctx, capability)) {
    throw new Error("Permission denied");
  }
};
