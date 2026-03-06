import { memo, useMemo } from "react";
import { Bell, CalendarDays, MessageSquare, Sparkles, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone?: "info" | "success" | "warning" | "default";
};

const resolveIcon = (title: string) => {
  const text = title.toLowerCase();
  if (text.includes("leave")) return CalendarDays;
  if (text.includes("message") || text.includes("chat")) return MessageSquare;
  if (text.includes("announcement")) return Sparkles;
  if (text.includes("shift")) return Timer;
  return Bell;
};

const ActivityFeedComponent = ({ items }: { items: ActivityItem[] }) => {
  const rendered = useMemo(
    () =>
      items.map((item) => {
        const Icon = resolveIcon(item.title);
        return (
          <div key={item.id} className="dashboard-timeline__item">
            <span className="dashboard-timeline__dot" />
            <div className="dashboard-timeline__content">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <strong>{item.title}</strong>
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <span className="dashboard-timeline__meta">{item.timestamp}</span>
          </div>
        );
      }),
    [items]
  );

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-lg">Activity feed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        {items.length === 0 ? (
          <EmptyState title="Your workspace is up to date" subtitle="No recent activity to display." compact />
        ) : (
          rendered
        )}
      </CardContent>
    </Card>
  );
};

export const ActivityFeed = memo(ActivityFeedComponent);
ActivityFeed.displayName = "ActivityFeed";
