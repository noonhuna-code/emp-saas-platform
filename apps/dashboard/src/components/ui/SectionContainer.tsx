import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const SectionContainer = ({
  title,
  subtitle,
  actions,
  children,
  tone = "default"
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  tone?: "default" | "soft" | "spotlight";
}) => {
  return (
    <Card
      className={cn(
        "rounded-xl border-border shadow-sm",
        tone === "soft" && "bg-[var(--surface-1)]",
        tone === "spotlight" && "bg-[var(--surface-2)]"
      )}
    >
      <CardHeader className="space-y-2 p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-xl">{title}</CardTitle>
            {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">{children}</CardContent>
    </Card>
  );
};