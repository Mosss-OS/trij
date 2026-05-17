import { Link, useRouter } from "@tanstack/react-router";
import { LayoutGrid, Camera, Users, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { translations } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settingsStore";

type NavItem = {
  to: string;
  labelKey: keyof (typeof translations)["en-US"];
  icon: typeof LayoutGrid;
  primary?: boolean;
};

export function BottomNav() {
  const { t } = useI18n();
  const router = useRouter();
  const current = router.state.location.pathname;
  const kioskMode = useSettingsStore((s) => s.kioskMode);

  const items: NavItem[] = [
    { to: "/dashboard", labelKey: "home", icon: LayoutGrid },
    { to: "/triage", labelKey: "newTriage", icon: Camera, primary: true },
    { to: "/patients", labelKey: "patients", icon: Users },
    { to: "/settings", labelKey: "settings", icon: SettingsIcon },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className={`fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur safe-area-bottom ${kioskMode ? "pb-2 pt-1" : ""}`}
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {items.map(({ to, labelKey, icon: Icon, primary }) => {
          const active = current === to || current.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to as never}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-3 font-medium transition-colors",
                kioskMode ? "gap-2 py-4 text-sm" : "text-xs",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "grid place-items-center rounded-2xl transition-all",
                  primary
                    ? kioskMode
                      ? "h-16 w-16 -translate-y-4 bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "h-12 w-12 -translate-y-3 bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : kioskMode
                      ? "h-10 w-10"
                      : "h-7 w-7",
                )}
              >
                <Icon className={kioskMode ? "h-7 w-7" : primary ? "h-5 w-5" : "h-5 w-5"} />
              </span>
              <span className={primary ? (kioskMode ? "-mt-3" : "-mt-2") : ""}>{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
