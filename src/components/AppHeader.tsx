import { OfflineIndicator } from "./OfflineIndicator";
import { SyncStatus } from "./SyncStatus";
import { Link } from "@tanstack/react-router";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-4">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img
            src="https://res.cloudinary.com/dv0tt80vn/image/upload/v1778960068/Trij_l7tyxj.png"
            alt="Trij logo — free offline AI medical triage app"
            className="h-9 w-9 rounded-xl object-contain"
          />
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
