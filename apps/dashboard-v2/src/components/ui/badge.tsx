import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]",
        success: "border-emerald-300/60 bg-emerald-500/10 text-emerald-600",
        warning: "border-amber-300/60 bg-amber-500/10 text-amber-600",
        danger: "border-rose-300/60 bg-rose-500/10 text-rose-600",
        info: "border-blue-300/60 bg-blue-500/10 text-blue-600"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
};
