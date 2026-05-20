export type Role = "chw" | "supervisor" | "admin";

export type Permission =
  | "patient:read:own"
  | "patient:read:team"
  | "patient:read:all"
  | "patient:write:own"
  | "patient:write:team"
  | "patient:write:all"
  | "assessment:read:own"
  | "assessment:read:team"
  | "assessment:read:all"
  | "assessment:write:own"
  | "assessment:write:team"
  | "analytics:view:own"
  | "analytics:view:team"
  | "analytics:view:region"
  | "config:read:own"
  | "config:read:team"
  | "config:read:all"
  | "config:write:own"
  | "config:write:team"
  | "config:write:all"
  | "supervisor:access"
  | "admin:access";

const RBAC_MATRIX: Record<Role, Permission[]> = {
  chw: [
    "patient:read:own",
    "patient:write:own",
    "assessment:read:own",
    "assessment:write:own",
    "analytics:view:own",
    "config:read:own",
    "config:write:own",
  ],
  supervisor: [
    "patient:read:own",
    "patient:read:team",
    "patient:write:own",
    "patient:write:team",
    "assessment:read:own",
    "assessment:read:team",
    "assessment:write:own",
    "assessment:write:team",
    "analytics:view:own",
    "analytics:view:team",
    "config:read:own",
    "config:read:team",
    "config:write:own",
    "supervisor:access",
  ],
  admin: [
    "patient:read:own",
    "patient:read:team",
    "patient:read:all",
    "patient:write:own",
    "patient:write:team",
    "patient:write:all",
    "assessment:read:own",
    "assessment:read:team",
    "assessment:read:all",
    "assessment:write:own",
    "assessment:write:team",
    "analytics:view:own",
    "analytics:view:team",
    "analytics:view:region",
    "config:read:own",
    "config:read:team",
    "config:read:all",
    "config:write:own",
    "config:write:team",
    "config:write:all",
    "supervisor:access",
    "admin:access",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return RBAC_MATRIX[role]?.includes(permission) ?? false;
}
