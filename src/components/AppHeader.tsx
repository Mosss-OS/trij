import { OfflineIndicator } from "./OfflineIndicator";
import { SyncStatus } from "./SyncStatus";
import { Link } from "@tanstack/react-router";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-4">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <span className="font-display text-lg font-bold">T</span>
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-semibold">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <SyncStatus />
          <OfflineIndicator />
        </div>
      </div>
    </header>
  );
}
