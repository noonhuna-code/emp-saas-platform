import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ActionCard({
  title,
  description,
  subtitle,
  href,
  onClick,
  icon: Icon = LayoutGrid,
  disabled = false,
  className
}: {
  title: string;
  description?: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}) {
  const bodyText = description ?? subtitle ?? "";

  const content = (
    <Card className="h-full transition-all duration-150 ease-out hover:-translate-y-[1px] hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/30">
            <Icon className="h-[18px] w-[18px] text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-sm font-semibold">{title}</p>
            {bodyText ? <p className="text-sm text-muted-foreground">{bodyText}</p> : null}
          </div>
          <ArrowRight className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className={cn("block", className)}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("block w-full text-left disabled:cursor-not-allowed disabled:opacity-60", className)}
    >
      {content}
    </button>
  );
}
