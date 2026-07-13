import { OfflineIndicator } from "./OfflineIndicator";
import { SyncStatus } from "./SyncStatus";
import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { t } = useI18n();
  return (
    <header className="fixed top-0 left-0 right-0 z-30 w-full h-14 sm:h-16 border-b bg-background/85 backdrop-blur safe-area-top">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-1 sm:gap-3 px-3 sm:px-5 h-full">
        <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0 flex-1 py-2">
          <img
            src="https://res.cloudinary.com/dv0tt80vn/image/upload/v1778960068/Trij_l7tyxj.png"
            alt={t("altTrijLogo")}
            className="h-9 w-9 shrink-0 rounded-xl object-contain"
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-base font-semibold leading-tight">{title}</p>
            {subtitle && <p className="truncate text-[11px] sm:text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <SyncStatus />
          <OfflineIndicator />
          <Link
            to="/settings"
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={t("settings")}
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
