import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getDB } from "@/lib/db";
import type { AuditEvent } from "@/types/trij";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/hooks/useRBAC";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_app/audit")({
  component: () => (
    <I18nErrorBoundary>
      <AuditLogPage />
    </I18nErrorBoundary>
  ),
});

function I18nErrorBoundary({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function AuditLogPage() {
  const { t } = useI18n();
  const role = useRole();
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (role === "chw") return;
    let alive = true;
    (async () => {
      try {
        const db = getDB();
        let items: AuditEvent[];
        if (filter === "all") {
          items = await db.auditLogs.orderBy("timestamp").reverse().limit(200).toArray();
        } else {
          items = await db.auditLogs
            .where("action")
            .equals(filter as AuditEvent["action"])
            .reverse()
            .limit(200)
            .toArray();
        }
        if (alive) setLogs(items);
      } catch {
        /* */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [filter, role]);

  if (role === "chw") {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-display text-xl font-bold">{t("accessDenied")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("supervisorOnly")}</p>
          <Button asChild className="mt-6">
            <Link to="/patients">{t("backToPatients")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const actionLabels: Record<string, string> = {
    "patient:read": "Patient View",
    "patient:list": "Patient List",
    "patient:create": "Patient Created",
    "patient:update": "Patient Updated",
    "assessment:read": "Assessment View",
    "assessment:create": "Assessment Created",
    "assessment:list": "Assessment List",
    "followup:read": "Follow-up View",
    "referral:read": "Referral List",
    "supervisor:read": "Supervisor View",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <AppHeader title={t("auditLog")} />
      <div className="mb-4 flex items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border px-3 py-1.5 text-sm"
        >
          <option value="all">{t("all")}</option>
          {Object.entries(actionLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{logs.length} {t("entries")}</span>
      </div>
      {loading ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("noAuditLogs")}</p>
      ) : (
        <div className="space-y-1">
          {logs.map((l) => (
            <div key={l.id} className="rounded-xl border bg-card px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{actionLabels[l.action] || l.action}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(l.timestamp).toLocaleString()}
                </span>
              </div>
              {l.patientId && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("patientId")}: {l.patientId.slice(0, 8)}...
                </p>
              )}
              {l.details && (
                <p className="mt-0.5 text-xs text-muted-foreground">{l.details}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
