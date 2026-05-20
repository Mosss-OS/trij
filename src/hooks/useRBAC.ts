import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { can, type Role, type Permission } from "@/lib/rbac";

export function useRole(): Role {
  const user = useSessionStore((s) => s.user);
  const isOfflineAuth = useSessionStore((s) => s.isOfflineAuth);
  const engineKind = useSettingsStore((s) => s.engineKind);

  if (isOfflineAuth || engineKind === "demo") return "chw";

  const role = (user?.user_metadata?.role as string) || "chw";
  if (role === "admin") return "admin";
  if (role === "supervisor") return "supervisor";
  return "chw";
}

export function usePermission(permission: Permission): boolean {
  const role = useRole();
  return can(role, permission);
}
