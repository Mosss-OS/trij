import { useCallback } from "react";
import { getDB } from "@/lib/db";
import { useSessionStore } from "@/stores/sessionStore";
import type { AuditAction, AuditEvent } from "@/types/trij";

export function useAuditLog() {
  const userId = useSessionStore((s) => s.user?.id ?? "anonymous");

  const log = useCallback(
    async (action: AuditAction, opts: {
      patientId?: string;
      resourceType: AuditEvent["resourceType"];
      resourceId?: string;
      details?: string;
    }) => {
      try {
        const db = getDB();
        await db.auditLogs.add({
          action,
          userId,
          patientId: opts.patientId,
          resourceType: opts.resourceType,
          resourceId: opts.resourceId,
          details: opts.details,
          timestamp: Date.now(),
          synced: false,
        });
      } catch {
        // silently fail — audit logging must never block the app
      }
    },
    [userId],
  );

  return { log };
}
