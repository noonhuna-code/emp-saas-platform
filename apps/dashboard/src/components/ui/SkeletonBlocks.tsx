import type { CSSProperties } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SkeletonLine = ({
  className,
  style
}: {
  className?: string;
  style?: CSSProperties;
}) => <div className={cn("animate-pulse rounded-md bg-muted/60", className)} style={style} aria-hidden="true" />;

export const SkeletonCard = ({
  rows = 3,
  className
}: {
  rows?: number;
  className?: string;
}) => (
  <Card className={cn("rounded-xl border-border shadow-sm", className)}>
    <CardHeader className="space-y-2 p-5 pb-3">
      <SkeletonLine className="h-3 w-24" />
      <SkeletonLine className="h-6 w-2/3" />
    </CardHeader>
    <CardContent className="space-y-3 p-5 pt-0">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonLine
          key={index}
          className={cn("h-4", index % 3 === 0 ? "w-full" : index % 3 === 1 ? "w-5/6" : "w-2/3")}
        />
      ))}
    </CardContent>
  </Card>
);

export const SkeletonList = ({
  rows = 5,
  className
}: {
  rows?: number;
  className?: string;
}) => (
  <Card className={cn("rounded-xl border-border shadow-sm", className)}>
    <CardContent className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <SkeletonLine className="h-8 w-8 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonLine className="h-4 w-3/4" />
            <SkeletonLine className="h-3 w-1/2" />
          </div>
          <SkeletonLine className="h-3 w-16" />
        </div>
      ))}
    </CardContent>
  </Card>
);

export const SkeletonTable = ({
  rows = 6,
  columns = 5,
  className
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) => (
  <Card className={cn("rounded-xl border-border shadow-sm", className)}>
    <CardContent className="space-y-3 p-5">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <SkeletonLine key={`header-${index}`} className="h-4 w-full" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, colIndex) => (
            <SkeletonLine key={`${rowIndex}-${colIndex}`} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </CardContent>
  </Card>
);

export const SkeletonChart = ({
  bars = 8,
  className
}: {
  bars?: number;
  className?: string;
}) => (
  <Card className={cn("rounded-xl border-border shadow-sm", className)}>
    <CardContent className="space-y-4 p-5">
      <SkeletonLine className="h-4 w-1/3" />
      <div className="flex h-32 items-end gap-2">
        {Array.from({ length: bars }).map((_, index) => {
          const height = Math.max(18, 26 + ((index * 17) % 80));
          return <SkeletonLine key={index} className="w-full rounded-t-md" style={{ height }} />;
        })}
      </div>
    </CardContent>
  </Card>
);
