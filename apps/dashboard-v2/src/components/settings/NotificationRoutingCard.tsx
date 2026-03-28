import Link from "next/link";
import { SurfacePanel } from "@/components/dashboard-v2/PagePrimitives";
import { Badge } from "@/components/ui/badge";
import type { SettingsNotificationSnapshot } from "@emp/services/settings.service";

type NotificationRoutingCardProps = {
  notifications: SettingsNotificationSnapshot;
};

export const NotificationRoutingCard = ({ notifications }: NotificationRoutingCardProps) => {
  return (
    <SurfacePanel
      title="Notification routing"
      description="Current notification posture for this account. EMP is using in-app delivery tied to approvals, leave events, and workspace activity."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Badge className={`rounded-full ${notifications.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
          {notifications.enabled ? "In-app notifications active" : "Notifications unavailable"}
        </Badge>
        <Badge className="rounded-full border-blue-200 bg-blue-50 text-blue-700">
          {notifications.unreadCount} unread
        </Badge>
        <Link
          href="/app/notifications"
          className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Open notification center
        </Link>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">{notifications.deliveryNote}</p>

      <div className="mt-5 grid gap-3">
        {notifications.recent.length === 0 ? (
          <p className="text-sm text-slate-500">No recent notifications to summarize.</p>
        ) : (
          notifications.recent.map((item) => (
            <div key={item.id} className="rounded-[20px] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <Badge className="rounded-full border-slate-200 bg-slate-100 text-slate-700">{item.type}</Badge>
                <Badge className={`rounded-full ${item.is_read ? "border-slate-200 bg-slate-100 text-slate-600" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  {item.is_read ? "Read" : "Unread"}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.message ?? "No additional message."}</p>
            </div>
          ))
        )}
      </div>
    </SurfacePanel>
  );
};
