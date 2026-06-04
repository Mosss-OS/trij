import { Link, useRouter } from "@tanstack/react-router";
import { LayoutGrid, Camera, Users, Bell, Menu, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { translations } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settingsStore";
import { useNotifications } from "@/hooks/useNotifications";
import { useState } from "react";
import {
  HomeIcon,
  CameraLarge,
  Person,
  NotificationIcon,
} from "@/components/PictogramIcons";

type NavItem = {
  to: string;
  labelKey: keyof (typeof translations)["en-US"];
  icon: typeof LayoutGrid;
  pictogramIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  primary?: boolean;
};

export function BottomNav() {
  const { t } = useI18n();
  const router = useRouter();
  const current = router.state.location.pathname;
  const kioskMode = useSettingsStore((s) => s.kioskMode);
  const fieldMode = useSettingsStore((s) => s.fieldMode);
  const pictogramMode = useSettingsStore((s) => s.pictogramMode);
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const items: NavItem[] = fieldMode
    ? [
        { to: "/triage", labelKey: "newTriage", icon: Camera, pictogramIcon: CameraLarge, primary: true },
        { to: "/patients", labelKey: "patients", icon: Users, pictogramIcon: Person },
        { to: "/consultations", labelKey: "navConsultations", icon: MessageSquare },
      ]
    : [
        { to: "/dashboard", labelKey: "home", icon: LayoutGrid, pictogramIcon: HomeIcon },
        { to: "/triage", labelKey: "newTriage", icon: Camera, pictogramIcon: CameraLarge, primary: true },
        { to: "/patients", labelKey: "patients", icon: Users, pictogramIcon: Person },
        { to: "/consultations", labelKey: "navConsultations", icon: MessageSquare },
        { to: "/notifications", labelKey: "notifications", icon: Bell, pictogramIcon: NotificationIcon },
      ];

  // Extract single word from label for pictogram mode
  const getSingleWordLabel = (labelKey: keyof (typeof translations)["en-US"]) => {
    return t(labelKey).split(' ')[0];
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64 lg:border-r lg:bg-card/95 lg:backdrop-blur">
        <div className="flex h-full flex-col">
          <div className="border-b p-6">
            <h2 className="text-lg font-bold text-foreground">Trij</h2>
            <p className="text-xs text-muted-foreground">Medical Triage System</p>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {items.map(({ to, labelKey, icon: Icon, pictogramIcon: PictogramIcon }) => {
              const active = current === to || current.startsWith(to + "/");
              const isBell = labelKey === "notifications";
              const usePictogram = pictogramMode && PictogramIcon;
              
              return (
                <Link
                  key={to}
                  to={to as never}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
                    active 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {usePictogram ? (
                    <PictogramIcon className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                  <span>{t(labelKey)}</span>
                  {isBell && unreadCount > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Main navigation"
        className={`lg:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur safe-area-bottom ${kioskMode || fieldMode ? "pb-2 pt-1" : ""}`}
      >
        <div className={`mx-auto grid max-w-4xl ${fieldMode ? "grid-cols-3" : "grid-cols-5"}`}>
          {items.map(({ to, labelKey, icon: Icon, pictogramIcon: PictogramIcon, primary }) => {
            const active = current === to || current.startsWith(to + "/");
            const isBell = labelKey === "notifications";
            const usePictogram = pictogramMode && PictogramIcon;
            const singleWordLabel = getSingleWordLabel(labelKey);
            
            return (
              <Link
                key={to}
                to={to as never}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-2 py-3 font-medium transition-colors cursor-pointer",
                  kioskMode ? "gap-2 py-4 text-sm" : "text-[10px] sm:text-xs",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isBell && unreadCount > 0 && (
                  <span className="absolute right-1/2 top-1.5 z-10 flex h-4 min-w-4 translate-x-[14px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                <span
                  className={cn(
                    "grid shrink-0 place-items-center rounded-2xl transition-all",
                    primary
                      ? kioskMode
                        ? "h-16 w-16 -translate-y-4 bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "h-12 w-12 -translate-y-3 bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : kioskMode
                        ? "h-10 w-10"
                        : "h-7 w-7",
                  )}
                >
                  {usePictogram ? (
                    <PictogramIcon className={kioskMode ? "h-7 w-7" : primary ? "h-5 w-5" : "h-5 w-5"} />
                  ) : (
                    <Icon className={kioskMode ? "h-7 w-7" : primary ? "h-5 w-5" : "h-5 w-5"} />
                  )}
                </span>
                <span className={cn("truncate max-w-[70px] sm:max-w-none", primary ? (kioskMode ? "-mt-3" : "-mt-2") : "")}>
                  {usePictogram ? singleWordLabel : t(labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Sidebar Toggle (for tablet) */}
      <div className="hidden md:flex lg:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm font-medium shadow-sm hover:bg-secondary transition-colors cursor-pointer"
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          {t("menu")}
        </button>
      </div>

      {/* Tablet Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div 
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-64 border-r bg-card/95 backdrop-blur p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Trij</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded p-2 hover:bg-secondary transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="space-y-2">
              {items.map(({ to, labelKey, icon: Icon, pictogramIcon: PictogramIcon }) => {
                const active = current === to || current.startsWith(to + "/");
                const isBell = labelKey === "notifications";
                const usePictogram = pictogramMode && PictogramIcon;
                
                return (
                  <Link
                    key={to}
                    to={to as never}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors cursor-pointer",
                      active 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {usePictogram ? (
                      <PictogramIcon className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                    <span>{t(labelKey)}</span>
                    {isBell && unreadCount > 0 && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
