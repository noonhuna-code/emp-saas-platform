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
        "section-container rounded-xl border-border shadow-sm",
        tone === "soft" && "section-container--soft bg-[var(--surface-1)]",
        tone === "spotlight" && "section-container--spotlight bg-[var(--surface-2)]"
      )}
    >
      <CardHeader className="section-container__head space-y-2 p-5 pb-3">
        <div className="section-container__head-row flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="section-container__title text-xl">{title}</CardTitle>
            {subtitle ? <CardDescription className="section-container__subtitle">{subtitle}</CardDescription> : null}
          </div>
          {actions ? <div className="section-container__actions flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="section-container__body space-y-4 p-5 pt-0">{children}</CardContent>
    </Card>
  );
};
