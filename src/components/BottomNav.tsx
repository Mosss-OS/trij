import { Link, useRouter } from "@tanstack/react-router";
import { LayoutGrid, Camera, Users, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutGrid; primary?: boolean };
const items: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutGrid },
  { to: "/triage", label: "Triage", icon: Camera, primary: true },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function BottomNav() {
  const router = useRouter();
  const current = router.state.location.pathname;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur safe-area-bottom">
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {items.map(({ to, label, icon: Icon, primary }) => {
          const active = current === to || current.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-3 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "grid place-items-center rounded-2xl transition-all",
                  primary
                    ? "h-12 w-12 -translate-y-3 bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "h-7 w-7"
                )}
              >
                <Icon className={primary ? "h-5 w-5" : "h-5 w-5"} />
              </span>
              <span className={primary ? "-mt-2" : ""}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
