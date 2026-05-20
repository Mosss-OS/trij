import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { I18nErrorBoundary } from "@/components/ErrorBoundary";
import { useNotifications } from "@/hooks/useNotifications";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Bell,
  BellRing,
  CheckCheck,
  RefreshCw,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  Loader2,
  Settings as SettingsIcon,
} from "lucide-react";
import type { NotificationKind } from "@/types/trij";

export const Route = createFileRoute("/_app/notifications")({
  component: () => (
    <I18nErrorBoundary kind="default">
      <NotificationsPage />
    </I18nErrorBoundary>
  ),
});

const ICONS: Record<NotificationKind, typeof Bell> = {
  referral_status: BellRing,
  follow_up_reminder: CalendarClock,
  sync_complete: CheckCircle2,
  supervisor_message: MessageSquare,
  protocol_update: AlertTriangle,
  app_update: RefreshCw,
};

function NotificationsPage() {
  const { t } = useI18n();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <>
      <AppHeader title={t("notifications")} />
      <div className="mx-auto max-w-2xl px-5 py-6">
        {unreadCount > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {unreadCount} {t("unread")}
            </p>
            <Button variant="ghost" size="sm" className="gap-2" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4" /> {t("markAllRead")}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("noNotifications")}</p>
            <Button variant="outline" size="sm" asChild className="mt-2 gap-2">
              <Link to="/settings">
                <SettingsIcon className="h-4 w-4" /> {t("settings")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = ICONS[n.kind];
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
                    n.read ? "bg-card" : "border-primary/20 bg-primary/5"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                      n.read ? "bg-muted" : "bg-primary/10"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${n.read ? "text-muted-foreground" : "font-medium"}`}>
                        {n.title}
                      </p>
                      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                        {formatRelative(new Date(n.createdAt))}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="rounded-full p-1.5 hover:bg-muted"
                        aria-label={t("markAsRead")}
                      >
                        <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                    {n.linkTo && (
                      <Link
                        to={n.linkTo as any}
                        className="rounded-full p-1.5 hover:bg-muted"
                        aria-label={t("open")}
                      >
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return date.toLocaleDateString();
}
